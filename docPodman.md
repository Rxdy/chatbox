# Commandes Podman pour gérer un pod
## Droit d'execution (sur le dossier chatbox): 
chmod -R u+rwX chatbox

## Créé le Network : 
podman network create chat-net

## Créer le pod : 
podman play kube chatbox-pod.yaml --network chat-net --publish 8080:8080 --publish 5173:5173

## Démarrer le pod : 
podman pod start chatbox  

## Arrêter le pod :
podman pod stop chatbox  

## Supprimer le pod (utile en cas de modification du YAML) :
podman pod rm chatbox  