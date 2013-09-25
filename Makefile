# Makefile for creating production version and package
# Requires docco
# 
# Files

SRC= app.feellondon.js libs/jade-middleware.js libs/live-reload.js libs/redis-set-storage.js libs/router.js libs/ws-repeater.js libs/linked-list.js libs/middleware.js libs/redis-timeseries-storage.js libs/twitter-at-client.js

# Color for make file
# Reference: http://jamesdolan.blogspot.co.uk/2009/10/color-coding-makefile-output.html
# Usage: @echo "$(OK_COLOR) Creating documentation $(NO_COLOR)" 
NO_COLOR=\x1b[0m
OK_COLOR=\x1b[32;01m
ERROR_COLOR=\x1b[31;01m
WARN_COLOR=\x1b[33;01m
# Usage: @echo "$(OK_STRING) Lorem" 
OK_STRING=$(OK_COLOR)[OK]$(NO_COLOR)
ERROR_STRING=$(ERROR_COLOR)[ERRORS]$(NO_COLOR)
WARN_STRING=$(WARN_COLOR)[WARNINGS]$(NO_COLOR)

# Builds the documentation and puts it into docs
# # Get the last updated file
LAST_TOUCHED_SRC= $(shell ls -1t $(SRC) | head -1)
LAST_TOUCHED_SRC_FILENAME= $(shell basename $(LAST_TOUCHED_SRC) .js)

.PHONY: clean build documentation

all: build documentation

clean:
	@echo "$(WARN_COLOR) --- Cleaning files ---$(NO_COLOR)" 
	@rm -rf docs
	@mkdir docs
	@echo "$(OK_STRING) Clean finished \n"

documentation:
	@echo "$(WARN_COLOR) --- Creating documentation  ---$(NO_COLOR)" 
	@./node_modules/.bin/docco -l classic -o docs $(SRC)
	@echo "$(OK_STRING) Documention created. Run \"make opendocs\" to view\n"

opendocs:
	@echo "$(WARN_COLOR) --- Opening docs file with google chrome---$(NO_COLOR)" 
	@echo "Last touched file $(LATEST_FILE)"
	@open -a "Google Chrome" docs/$(LAST_TOUCHED_SRC_FILENAME).html