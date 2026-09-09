#!/usr/bin/env bash
set -euo pipefail

target="${1:-/srv/quantixlab-maps}"
minimum_gib="${MIN_FREE_GIB:-500}"
minimum_ram_gib="${MIN_RAM_GIB:-32}"
minimum_cpus="${MIN_CPUS:-8}"
[[ "$(uname -s)" == Linux ]] || { echo 'release builds require Linux' >&2; exit 69; }
case "$(uname -m)" in x86_64|aarch64|arm64) ;; *) echo 'unsupported CPU architecture' >&2; exit 69 ;; esac
for command_name in curl docker jq md5sum osmium pmtiles sha256sum tar zstd; do
  command -v "$command_name" >/dev/null || { echo "missing command: $command_name" >&2; exit 69; }
done
mkdir -p "$target"
free_gib="$(df -Pk "$target" | awk 'NR==2 {print int($4/1024/1024)}')"
ram_gib="$(awk '/MemTotal/ {print int($2/1024/1024)}' /proc/meminfo)"
cpus="$(getconf _NPROCESSORS_ONLN)"
(( free_gib >= minimum_gib )) || { echo "need ${minimum_gib}GiB free; found ${free_gib}GiB" >&2; exit 70; }
(( ram_gib >= minimum_ram_gib )) || { echo "need ${minimum_ram_gib}GiB RAM; found ${ram_gib}GiB" >&2; exit 70; }
(( cpus >= minimum_cpus )) || { echo "need ${minimum_cpus} CPUs; found ${cpus}" >&2; exit 70; }
docker info >/dev/null
echo "preflight passed: arch=$(uname -m) disk=${free_gib}GiB ram=${ram_gib}GiB cpus=$cpus"
