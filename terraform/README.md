# Terraform deployment for ecommerce-tracking-api

Esta carpeta contiene la infraestructura necesaria para desplegar la API y el frontend en AWS ECS.

## Requisitos

- AWS CLI configurado con credenciales válidas
- Terraform 1.5+ instalado
- AWS_REGION configurado en el entorno
- AWS_ACCOUNT_ID configurado en el entorno

## Uso

1. Copia el ejemplo de variables:

   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Rellena `terraform.tfvars` con tus valores reales.

3. Inicializa Terraform:

   ```bash
   terraform init
   ```

4. Revisa el plan:

   ```bash
   terraform plan -var-file=terraform.tfvars
   ```

5. Aplica el despliegue:

   ```bash
   terraform apply -var-file=terraform.tfvars
   ```

## Jenkins

El `Jenkinsfile` del repositorio ya incluye:

- clonación del frontend desde `${GIT_FRONT_URL}`
- construcción y push de imágenes Docker a ECR
- inicialización y aplicación de Terraform

Asegúrate de tener definidas las variables de entorno de Jenkins:

- `AWS_REGION`
- `AWS_ACCOUNT_ID`
- `GIT_FRONT_CREDENTIALS`
- `VITE_API_URL` opcional si la aplicación frontend la necesita
