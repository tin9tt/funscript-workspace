# funscript workspace

It's a funscript player and editor that works with video and audio.

## Running this software

### Using the docker image

```sh
docker run --rm \
  -p 3000/tcp \
  --name fsworkspace \
  tin9tt/funscript-workspace:latest
```

### From src

Download the most suitable src from the repository.

Then:

```sh
bun install
bun build
bun start
```

## Contributing

Refer to the documentation in [CONTRIBUING.md](CONTRIBUTING.md).
