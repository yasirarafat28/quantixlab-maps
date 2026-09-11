# Ubuntu production deployment

Task: QLM-MAP-001

This runbook creates a new standalone `maps.quantixlab.dev` host. Run commands as the `deploy` operator unless a
step opens a root shell. Replace every `REPLACE_*` value; never paste secrets into Git or shell history.

## 1. Deployment gates

Before purchasing or changing the host, confirm:

- Ubuntu 24.04 LTS, 64-bit `amd64` or `arm64`, at least 8 vCPU, 32 GiB RAM, fast NVMe, and 500 GiB free.
- A second release can fit beside the active release. The performance gate determines final production sizing.
- A reviewed Git tag and successful CI exist. The worktree used for deployment must be clean.
- Gateway and Photon multi-architecture images were published by `.github/workflows/images.yml`.
- Approved immutable Photon dump and Noto glyph-bundle URLs and SHA-256 checksums are available.
- The VPS public IPv4 address, SSH source IP/CIDR, DNS access, and optional R2 bucket credentials are available.

Do not continue with placeholder image digests, unapproved data, or an uncommitted repository.

## 2. VPS and DNS

Create these DNS records with a low TTL during rollout:

- `maps.quantixlab.dev` `A` -> `REPLACE_VPS_IPV4`
- `tourbond-maps.quantixlab.dev` `A` -> `REPLACE_VPS_IPV4` for the 90-day migration window
- Add `AAAA` only after IPv6 routing and firewall rules are verified.

At the provider firewall allow TCP 22 only from `REPLACE_SSH_CIDR`, TCP 80/443 from the internet, and UDP 443 from the
internet. Deny every other inbound port. Docker-published ports can bypass UFW, so the provider firewall is
mandatory. Never expose 2322, 3000, 6379, 8002, or 8080.

## 3. First login and SSH hardening

Log in using the provider's temporary account, create the operator, and add its public key:

```bash
sudo adduser deploy
sudo usermod -aG sudo,docker deploy 2>/dev/null || sudo usermod -aG sudo deploy
sudo install -d -m 0700 -o deploy -g deploy /home/deploy/.ssh
sudoedit /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 0600 /home/deploy/.ssh/authorized_keys
```

Prove key-based `deploy` login in a second terminal before disabling root/password SSH. Apply the recovery-compatible
policy in `/etc/ssh/sshd_config.d/99-quantixlab.conf`, run `sudo sshd -t`, and keep recovery open until login succeeds.

## 4. Base packages and Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git jq osmium-tool openssl tmux ufw unattended-upgrades unzip zstd
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker deploy
sudo docker run --rm hello-world
```

Configure Docker log rotation and its data root. Install a checksum-verified, pinned official `pmtiles` binary in
`/usr/local/bin`. Log in again for Docker-group membership; that group is root-equivalent.

Configure UFW only after preserving SSH, then confirm the provider firewall separately:

```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow proto tcp from REPLACE_SSH_CIDR to any port 22
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
sudo ufw enable && sudo ufw status verbose
```

## 5. Source and protected directories

```bash
sudo install -d -m 0750 -o deploy -g deploy /opt/quantixlab-maps
sudo install -d -m 2770 -o root -g docker /srv/quantixlab-maps/{releases,artifacts}
sudo install -d -m 0700 -o root -g root /etc/quantixlab-maps
sudo chown deploy:deploy /opt/quantixlab-maps
git clone https://github.com/yasirarafat28/quantixlab-maps.git /opt/quantixlab-maps
cd /opt/quantixlab-maps
git fetch --tags && git checkout REPLACE_REVIEWED_TAG
git status --short
```

The final command must print nothing. Install AWS CLI v2 only when R2 archiving is enabled.

## 6. Images, configuration, and credentials

Copy the image references and manifest-list digests produced by the tagged GitHub Actions run. Use the exact GHCR
paths produced by that run; do not assume the examples match the repository owner.

```bash
sudo -i
cd /opt/quantixlab-maps
cp deploy/environment.example /etc/quantixlab-maps/deploy.env
cp .env.example /etc/quantixlab-maps/maps.env
cp deploy/maps/users.acl.example /etc/quantixlab-maps/users.acl
printf '{"schemaVersion":1,"projects":[]}\n' >/etc/quantixlab-maps/projects.json
chmod 0600 /etc/quantixlab-maps/{deploy.env,maps.env,users.acl}
chown 999:999 /etc/quantixlab-maps/users.acl
chown 0:1000 /etc/quantixlab-maps/projects.json && chmod 0640 /etc/quantixlab-maps/projects.json
```

Generate distinct values with `openssl rand -base64 48` and store them in a password manager. In `maps.env`, replace
`MAP_KEY_HASH_SECRET`, `OPERATOR_TOKEN`, and the password inside `REDIS_URL`. In `deploy.env`, set the same Valkey
password where required, a separate health password, all real `@sha256:` image references, and the production paths.
Hash the two Valkey passwords with `valkey-cli ACL HASH-PASSWORD`, replace both ACL placeholders, and retain only the
hashes in `users.acl`. Preserve every command in the template, including `+hmget`, because the gateway's rate limiter
uses it inside Lua. ACL files contain only `user` rules; keep explanatory comments outside that file. If
`valkey-cli` is not installed on the host, run the pinned Valkey image interactively with
`docker run --rm -it --entrypoint valkey-cli "$VALKEY_IMAGE"` and enter `ACL HASH-PASSWORD` there. Validate:

```bash
set -a; source /etc/quantixlab-maps/deploy.env; source /etc/quantixlab-maps/maps.env; set +a
deploy/release/verify-images.sh
docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml config --quiet
```

## 7. Create the first project

Use the gateway image as the operator CLI; this avoids installing Node.js on the host:

```bash
map_cli() {
  docker run --rm --user 0:0 --env-file /etc/quantixlab-maps/maps.env \
    -v /etc/quantixlab-maps:/etc/quantixlab-maps "$GATEWAY_IMAGE" node dist/cli/index.js "$@"
  result=$?; chown 0:1000 /etc/quantixlab-maps/projects.json; chmod 0640 /etc/quantixlab-maps/projects.json; return "$result"
}
map_cli project create tourbond --name TourBond
map_cli key create tourbond --type publishable --scopes assets:read
map_cli key create tourbond --type secret \
  --scopes geocode:read,route:read,match:read,matrix:read,usage:read
map_cli config validate
```

Each token prints once; put it directly in the secret manager. The pinned gateway uses UID/GID `1000`; recheck it
after base-image changes. The wrapper restores gateway-readable ownership after every atomic CLI write.

## 8. Build and archive the first dataset

Start `tmux`, create the coastline/landcover bundle per [data releases](data-releases.md), choose `YYYY-MM-DD.N`, and
export every approved immutable URL/checksum. Do not use `latest` URLs or guess checksums.

```bash
export PHOTON_DUMP_URL='REPLACE_APPROVED_IMMUTABLE_URL' PHOTON_DUMP_SHA256='REPLACE_SHA256'
export FONT_BUNDLE_URL='REPLACE_APPROVED_IMMUTABLE_URL' FONT_BUNDLE_SHA256='REPLACE_SHA256' \
  TILEMAKER_ASSETS_URL='REPLACE_APPROVED_IMMUTABLE_URL' TILEMAKER_ASSETS_SHA256='REPLACE_SHA256' MAP_PUBLIC_BASE_URL='https://maps.quantixlab.dev'
deploy/release/preflight.sh /srv/quantixlab-maps
deploy/release/build-release.sh REPLACE_RELEASE_ID /srv/quantixlab-maps
```

If R2 is enabled, configure a bucket-scoped read/write credential, set `R2_ENDPOINT`, and run:

```bash
deploy/release/publish-release.sh REPLACE_RELEASE_ID /srv/quantixlab-maps \
  s3://quantixlab-map-artifacts/releases
```

## 9. Roll out and accept

Export the newly created acceptance tokens as `PUBLISHABLE_KEY` and `SERVER_KEY`, verify DNS resolves to this VPS,
then run:

```bash
read -rsp 'Publishable key: ' PUBLISHABLE_KEY; echo; export PUBLISHABLE_KEY
read -rsp 'Server key: ' SERVER_KEY; echo; export SERVER_KEY
deploy/release/rollout-release.sh REPLACE_RELEASE_ID /srv/quantixlab-maps /etc/quantixlab-maps/deploy.env
curl -fsS https://maps.quantixlab.dev/health/live
curl -fsS -H "Authorization: Bearer $OPERATOR_TOKEN" \
  http://127.0.0.1:8080/internal/health/ready | jq
unset PUBLISHABLE_KEY SERVER_KEY
docker compose --env-file /etc/quantixlab-maps/deploy.env -f deploy/compose.yaml ps
```

Rollout automatically restores the previous release if health or acceptance fails. For the first release, preserve
the failed data and logs for diagnosis because no previous release exists.

## 10. Production approval and TourBond cutover

Run the 100-consumer/15-minute load gate, device checks for local-script shaping, encrypted backup/restore, alerting,
and manual rollback rehearsal. Record the host specification, Git tag, image digests, dataset manifest, checksums,
and results in the task evidence.

Do not point TourBond's legacy `PHOTON_URL`, `VALHALLA_URL`, or `MAP_EDGE_URL` at this gateway. Migrate the TourBond
backend to the server-key API and the app to authenticated asset requests, validate signed builds, then retain the
compatibility DNS alias for 90 days. Only then mark QLM-MAP-001 complete.

## Maintained references

Recheck time-sensitive steps against official [Docker](https://docs.docker.com/engine/install/ubuntu/), [Ubuntu](https://ubuntu.com/server/docs/security-firewall/),
[Caddy](https://caddyserver.com/docs/automatic-https), [PMTiles](https://github.com/protomaps/go-pmtiles/releases), and [R2](https://developers.cloudflare.com/r2/examples/aws/aws-cli/) guidance.
