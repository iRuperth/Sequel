SHELL := /bin/bash
.DEFAULT_GOAL := help

ENV_FILE := .env
ENV_TEMPLATE := .env.example
COMPOSE := docker compose --env-file $(ENV_FILE) -f docker/compose.yaml
CLI := pnpm --filter @sequel/cli start
K8S_ENV ?= local
IMAGE_TAG ?= latest
IMAGES := api worker cli
WEB_BUILD_ARGS = --build-arg API_URL=$(API_URL) --build-arg API_BASE_PATH=$(API_BASE_PATH) \
	--build-arg JOB_POLL_INTERVAL_MS=$(JOB_POLL_INTERVAL_MS) --build-arg APP_VERSION=$(APP_VERSION)

ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

.PHONY: help env install infra wait setup bootstrap migrate seed seed-force dev up down reset logs ps \
	lint typecheck test test-integration format build docker-build app-up app-down k8s-apply k8s-delete clean

help:
	@printf "Sequel developer commands\n\n"
	@printf "  make dev               Start Postgres and Redis, prepare databases, run web, api and worker with hot reload\n"
	@printf "  make up / down         Start or stop the infrastructure containers\n"
	@printf "  make setup             Bootstrap roles, run migrations and seed if the warehouse is empty\n"
	@printf "  make seed-force        Reload every dataset, catalog entry and starter task\n"
	@printf "  make reset             Stop containers and delete all data volumes\n"
	@printf "  make lint / typecheck / test / test-integration\n"
	@printf "  make build             Build every app and package\n"
	@printf "  make docker-build      Build production images\n"
	@printf "  make app-up            Run the full stack from production images\n"
	@printf "  make k8s-apply         Apply Kubernetes manifests (K8S_ENV=local or prod)\n"

env:
	@test -f $(ENV_FILE) || cp $(ENV_TEMPLATE) $(ENV_FILE)

install: env
	pnpm install --frozen-lockfile

infra: env
	$(COMPOSE) up -d --wait postgres redis

wait: infra

up: infra

down:
	$(COMPOSE) --profile app down

reset:
	$(COMPOSE) --profile app down --volumes

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

bootstrap: infra
	$(CLI) bootstrap

migrate: infra
	$(CLI) migrate

setup: infra
	$(CLI) setup

seed: infra
	$(CLI) seed

seed-force: infra
	$(CLI) seed --force

dev: env install setup
	pnpm dev

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

test-integration: infra
	pnpm test:integration

format:
	pnpm format

build:
	pnpm build

docker-build:
	@for image in $(IMAGES); do \
		docker build -f docker/$$image.Dockerfile -t sequel-$$image:$(IMAGE_TAG) . || exit 1; \
	done
	docker build -f docker/web.Dockerfile $(WEB_BUILD_ARGS) -t sequel-web:$(IMAGE_TAG) .

app-up: env
	$(COMPOSE) --profile app up -d --build

app-down:
	$(COMPOSE) --profile app down

k8s-apply:
	kubectl apply -k k8s/overlays/$(K8S_ENV)

k8s-delete:
	kubectl delete -k k8s/overlays/$(K8S_ENV)

clean:
	rm -rf node_modules apps/*/node_modules packages/*/node_modules tests/*/node_modules apps/*/dist apps/web/.next .turbo
