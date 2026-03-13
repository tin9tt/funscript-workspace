.PHONY: release
release:
	docker login
	docker build \
		-t tin9tt/funscript-workspace:latest \
		-t tin9tt/funscript-workspace:$(shell git describe --tags --abbrev=0) \
		-f Dockerfile .
