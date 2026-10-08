#!/bin/sh
set -eu
export XDG_DATA_HOME=/workspace/.ultimateman-tools/data
export XDG_CACHE_HOME=/workspace/.ultimateman-tools/cache
export XDG_CONFIG_HOME=/workspace/.ultimateman-tools/config
mkdir -p "$XDG_DATA_HOME" "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME"
exec godot "$@"
