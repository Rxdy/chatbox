ENV = dev
o = -d

rund: vscode gitPull up
run: vscode gitPull 
	$(MAKE) up o=

reset: down up

up:
	docker compose -f docker-compose.$(ENV).yml up $(o)

gitPull:
	git pull

vscode:
	code .

down:
	docker compose -f docker-compose.$(ENV).yml down

test: 
	docker compose -f docker-compose.test.yml up --abort-on-container-exit