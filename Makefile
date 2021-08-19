# Copyright 2020 Marius Wilms, Christoph Labacher. All rights reserved.
# Copyright 2019 Atelier Disko. All rights reserved.
#
# Use of this source code is governed by a BSD-style
# license that can be found in the LICENSE file.

NODE_ENV ?= production
MINIFY ?= n
VERSION ?= $(shell head -n1 VERSION.txt)

ALL_SOURCE = $(shell find . -type d \( -name build -or -name dist \) -prune -or -type f -print)

.PHONY: dev
dev:
	WATCH=y MINIFY=n yarn node esbuild.js

.PHONY: test
test:

.PHONY: build
build: build/index.js

build/index.js: $(ALL_SOURCE)
	MINIFY=$(MINIFY) yarn node esbuild.js

.PHONY: dist
dist:

.PHONY: lint
lint:
	yarn eslint --cache src

.PHONY: format
format:
	yarn eslint --fix --cache src
	yarn prettier --write src/**

.PHONY: clean
clean:
	if [ -d ./build ]; then rm -r ./build; fi
	if [ -d ./dist ]; then rm -r ./dist; fi
