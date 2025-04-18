# Commandes Podman pour gérer un pod

## Créer le pod : 
podman play kube chatbox-pod.yaml --network chat-net --publish 8080:8080 --publish 5173:5173

## Démarrer le pod : 
podman pod start chatbox  

## Arrêter le pod :
podman pod stop chatbox  

## Supprimer le pod (utile en cas de modification du YAML) :
podman pod rm chatbox  