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
## Before
- Unpack containers (.zip etc)
## Merge
- Default text merger
- Custom mergers
## After
- No-op
- Repack containers
- Custom format validator