-- TB-MAP-015: the digest-pinned image owns the OpenMapTiles processing logic.
-- This versioned entrypoint fixes its output language fields deterministically.
dofile("/usr/src/app/process.lua")

preferred_language = nil
preferred_language_attribute = "name"
default_language_attribute = nil
additional_languages = { "en" }
