#!/bin/sh

list=(
  "a"
  "b"
  "c"
)

for item in "${list[@]}"; do
  echo "$item"
done
