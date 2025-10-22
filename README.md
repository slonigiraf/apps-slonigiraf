# Slonig (Frontend) - Helping Students Teach Each Other

[**Slonig**](https://app.slonig.org) is an open-source, free-to-use web platform that helps teachers make students talk more during lessons. The approach of having students talk and teach each other has been known for decades and has been shown to be one of the most powerful ways to improve educational outcomes ([Dietrichson et al., 2017](https://doi.org/10.3102/0034654316687036)). However, it’s challenging for teachers to organize this process: it involves complex logistics (deciding who works with whom), creating materials for such activities, and training students to effectively tutor their peers.

Slonig solves all these problems in one solution: it includes all learning materials (open for editing like Wikipedia), guides students on how to perform tutoring using a built-in algorithm, validates the quality of the process through game theory, and enables all this to happen while **students talk to each other face to face in the same classroom**!

<img alt="Image" src="https://github.com/slonigiraf/slonig/blob/main/tutoring-overview.png?raw=true" width="750">

## Other Slonig components

- [Frontend - this repo](https://github.com/slonigiraf/apps-slonigiraf)
- [Backend](https://github.com/slonigiraf/slonig-node-dev)
- [Auxiliary services](https://github.com/slonigiraf/economy.slonig.org)

## Pilot-tested in schools

We conducted pilot lessons with Slonig in several schools and observed remarkable efficiency in training students to teach their peers. In most cases, just one lesson was enough to start effective peer learning. You can read more in our [research paper](https://slonig.org/assets/pdf/site.Slonig-paper.pdf).

## Technical details for developers

If you’re a developer or interested in contributing to the project’s design, you may want to explore our [technical draft white paper](https://github.com/slonigiraf/whitepaper/blob/main/slonigiraf/ENG.md). It’s a long read and still under development, so please keep that in mind when reviewing sections on tokenomics and the business model — these are early drafts and likely to be revised soon. You’re welcome to contribute by proposing improvements or changes.

## Contacts
- Try the Slonig App: https://app.slonig.org/
- Our Website: https://slonig.org/
- WhatsApp: [+382 67 887600](https://wa.me/38267887600)
- Email: [reshetovdenis@gmail.com](mailto:reshetovdenis@gmail.com)

## Development

Contributions are welcome!

To start off, this repo uses yarn workspaces to organize the code. As such, after cloning dependencies _should_ be installed via `yarn`, not via npm, the latter will result in broken dependencies.

**To get started**

1. Clone the repo locally, via `git clone https://github.com/slonigiraf/slonig.git <optional local path>`
2. Ensure that you have a recent LTS version of Node.js, for development purposes [Node >= 16](https://nodejs.org/en/) is recommended.
3. Ensure that you have a recent version of Yarn, for development purposes [Yarn >= 1.22](https://yarnpkg.com/docs/install) is required.
4. Install the dependencies by running `yarn`
5. Ensure that the [Backend](https://github.com/slonigiraf/slonig-node-dev), IPFS, PeerJS, Coturn, and [Auxiliary services](https://github.com/slonigiraf/economy.slonig.org) are running.
6. Specify system variables
```
export IPFS_SERVER=ipfs.some.org
export PEERJS_SERVER=peerjs.some.org
export COTURN_SERVER=coturn.some.org:3478
export COTURN_USER=some
export COTURN_PASSWORD=some
export AIRDROP_AUTH_TOKEN=some
```
7. Ready! Now you can launch the UI, via `yarn run start`
8. Access the UI via [http://localhost:3000](http://localhost:3000)


## Docker

Build a docker container

```
export $(cat .env | xargs) && \
docker build -t app-slonig-org -f docker/Dockerfile \
  --build-arg IPFS_SERVER=$IPFS_SERVER \
  --build-arg PEERJS_SERVER=$PEERJS_SERVER \
  --build-arg COTURN_SERVER=$COTURN_SERVER \
  --build-arg COTURN_USER=$COTURN_USER \
  --build-arg COTURN_PASSWORD=$COTURN_PASSWORD \
  --build-arg AIRDROP_AUTH_TOKEN=$AIRDROP_AUTH_TOKEN \
  .
```

Example docker-compose.yml
```
services:
  app-some-org:
    image: app-some-org
    container_name: app-some-org
    restart: unless-stopped
    environment:
      - WS_URL=wss://ws-parachain-1.slonigiraf.org
      - VIRTUAL_HOST=app.some.org  
      - VIRTUAL_PORT=80
      - LETSENCRYPT_HOST=app.some.org
      - LETSENCRYPT_EMAIL=some@gmail.com
    expose:
      - 80

networks:
  default:
    name: nginx-proxy
    external: true
```