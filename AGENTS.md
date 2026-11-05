# masculinecache/simplefin-axi

## Repo identity

GitHub and npm operations on this repository route to the **masculinecache** account only — never ambient/phillias credentials. On a 403 or wrong-account auth failure, stop and report blocked; never retry with different credentials or switch accounts. See the five-layer routing scheme in the masculinecache-repo-identity skill.

## Publishing

This repo uses npm Trusted Publishing with OIDC (`id-token: write` in the publish workflow). No PAT or npm token secrets are required or stored.
