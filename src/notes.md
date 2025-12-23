# Goals
- Three-way merges
- Merge files inside other files
    - virtual filesystem?
- Extensible for lots of file formats
- Built-in diff and conflict tool
- Async the entire thing

# Stages
## Load
- from a string
- from files on disk
- from the Internet
- from ???
## Plan
- Decide what _before_, _merge_, and _after_ steps to use
- Interpret contents and decide on MIME type.
## Before
- Unpack containers (.zip etc)
## Merge
- Default text merger
- Custom mergers
## After
- No-op
- Repack containers
- Custom format validator