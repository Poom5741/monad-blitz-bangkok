APP_DIR := monad-pos/app
CONTRACTS_DIR := monad-pos/contracts

.PHONY: help
help:
	@echo "Targets:"
	@echo "  install           Install app dependencies"
	@echo "  dev               Run Next.js dev server"
	@echo "  build             Build Next.js app"
	@echo "  start             Start Next.js production server"
	@echo "  env-setup         Copy env example to .env.local"
	@echo "  anvil             Start local Anvil node"
	@echo "  forge-build       Build Foundry contracts"
	@echo "  forge-test        Run Foundry tests"
	@echo "  deploy RPC=<url> KEY=<hex>  Deploy via Foundry script"

.PHONY: install
install:
	cd $(APP_DIR) && pnpm install

.PHONY: dev
dev:
	cd $(APP_DIR) && pnpm run dev

.PHONY: build
build:
	cd $(APP_DIR) && pnpm run build

.PHONY: start
start:
	cd $(APP_DIR) && pnpm run start

.PHONY: env-setup
env-setup:
	cp -n $(APP_DIR)/.env.example $(APP_DIR)/.env.local || true
	@echo "Copied .env.example to .env.local (if missing)."

.PHONY: anvil
anvil:
	anvil

.PHONY: forge-build
forge-build:
	cd $(CONTRACTS_DIR) && forge build

.PHONY: forge-test
forge-test:
	cd $(CONTRACTS_DIR) && forge test -vvv

.PHONY: deploy
deploy:
	@if [ -z "$(RPC)" ] || [ -z "$(KEY)" ]; then \
		echo "Usage: make deploy RPC=<rpc_url> KEY=<private_key>"; \
		exit 1; \
	fi
	cd $(CONTRACTS_DIR) && forge script script/Deploy.s.sol --rpc-url $(RPC) --private-key $(KEY) --broadcast

