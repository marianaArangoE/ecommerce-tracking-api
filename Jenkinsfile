pipeline {
    agent any

    tools {
        nodejs 'Node-22'
    }

    environment {
        DIR_FRONT = 'ecommerce-tracking-front'
        GIT_FRONT_URL = 'https://github.com/Juank0017/ecommerce-tracking-front.git'
        GIT_FRONT_CREDENTIALS = "${env.GIT_FRONT_CREDENTIALS ?: 'github-front'}"
        AWS_REGION = "${env.AWS_REGION ?: 'us-east-1'}"
        AWS_ACCOUNT_ID = "${env.AWS_ACCOUNT_ID ?: ''}"
        ECR_API_REPO = 'ecommerce-tracking-api'
        ECR_FRONT_REPO = 'ecommerce-tracking-front'
        TERRAFORM_DIR = 'terraform'
        FRONT_IMAGE_TAG = "${env.FRONT_IMAGE_TAG ?: 'latest'}"
        API_IMAGE_TAG = "${env.API_IMAGE_TAG ?: 'latest'}"
        CLIENT_ORIGINS = "${env.CLIENT_ORIGINS ?: '*'}"
        FRONTEND_URL = "${env.FRONTEND_URL ?: 'http://localhost'}"
        SERVICE_DESIRED_COUNT = "${env.SERVICE_DESIRED_COUNT ?: '1'}"
    }

    stages {
        stage('Resolve API folder') {
            steps {
                script {
                    if (fileExists('package.json')) {
                        env.DIR_API = '.'
                    } else if (fileExists('ecommerce-tracking-api/package.json')) {
                        env.DIR_API = 'ecommerce-tracking-api'
                    } else {
                        error('No se encontró package.json del API en la raíz ni en ecommerce-tracking-api/.')
                    }
                }
            }
        }

        stage('Checkout Frontend') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: '*/main']],
                    extensions: [
                        [$class: 'RelativeTargetDirectory', relativeTargetDir: "${env.DIR_FRONT}"]
                    ],
                    userRemoteConfigs: [[
                        url: "${env.GIT_FRONT_URL}",
                        credentialsId: "${env.GIT_FRONT_CREDENTIALS}"
                    ]]
                ])
            }
        }

        stage('Install API dependencies') {
            steps {
                dir(env.DIR_API) {
                    script {
                        if (isUnix()) {
                            sh 'node -v && npm -v && npm ci'
                        } else {
                            bat 'node -v && npm -v && npm ci'
                        }
                    }
                }
            }
        }

        stage('Run API tests') {
            steps {
                dir(env.DIR_API) {
                    script {
                        if (isUnix()) {
                            sh 'npx jest --coverage --runInBand'
                        } else {
                            bat 'npx jest --coverage --runInBand'
                        }
                    }
                }
            }
        }

        stage('Build Docker images') {
            steps {
                script {
                    if (!env.AWS_ACCOUNT_ID?.trim()) {
                        error('La variable de entorno AWS_ACCOUNT_ID es requerida para construir las imágenes ECR.')
                    }

                    env.API_IMAGE_URI = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_API_REPO}:${env.API_IMAGE_TAG}"
                    env.FRONT_IMAGE_URI = "${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com/${env.ECR_FRONT_REPO}:${env.FRONT_IMAGE_TAG}"

                    dir(env.DIR_API) {
                        if (isUnix()) {
                            sh "docker build -t ${env.API_IMAGE_URI} ."
                        } else {
                            bat "docker build -t ${env.API_IMAGE_URI} ."
                        }
                    }

                    if (isUnix()) {
                        sh "docker build -t ${env.FRONT_IMAGE_URI} -f ${env.DIR_FRONT}/Dockerfile ${env.DIR_FRONT}"
                    } else {
                        bat "docker build -t ${env.FRONT_IMAGE_URI} -f ${env.DIR_FRONT}/Dockerfile ${env.DIR_FRONT}"
                    }
                }
            }
        }

        stage('AWS ECR Login') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                        if (isUnix()) {
                            sh "export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && aws ecr get-login-password --region ${env.AWS_REGION} | docker login --username AWS --password-stdin ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                        } else {
                            bat "set AWS_ACCESS_KEY_ID=%AWS_ACCESS_KEY_ID% && set AWS_SECRET_ACCESS_KEY=%AWS_SECRET_ACCESS_KEY% && aws ecr get-login-password --region ${env.AWS_REGION} | docker login --username AWS --password-stdin ${env.AWS_ACCOUNT_ID}.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
                        }
                    }
                }
            }
        }

        stage('Create ECR repositories') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                        if (isUnix()) {
                            sh "export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && aws ecr describe-repositories --repository-names ${env.ECR_API_REPO} || aws ecr create-repository --repository-name ${env.ECR_API_REPO}; aws ecr describe-repositories --repository-names ${env.ECR_FRONT_REPO} || aws ecr create-repository --repository-name ${env.ECR_FRONT_REPO}"
                        } else {
                            bat "powershell -Command \"if (-not (aws ecr describe-repositories --repository-names ${env.ECR_API_REPO} -ErrorAction SilentlyContinue)) { aws ecr create-repository --repository-name ${env.ECR_API_REPO} }; if (-not (aws ecr describe-repositories --repository-names ${env.ECR_FRONT_REPO} -ErrorAction SilentlyContinue)) { aws ecr create-repository --repository-name ${env.ECR_FRONT_REPO} }\""
                        }
                    }
                }
            }
        }

        stage('Push images to ECR') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                        if (isUnix()) {
                            sh "export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && docker push ${env.API_IMAGE_URI} && docker push ${env.FRONT_IMAGE_URI}"
                        } else {
                            bat "set AWS_ACCESS_KEY_ID=%AWS_ACCESS_KEY_ID% && set AWS_SECRET_ACCESS_KEY=%AWS_SECRET_ACCESS_KEY% && docker push ${env.API_IMAGE_URI} & docker push ${env.FRONT_IMAGE_URI}"
                        }
                    }
                }
            }
        }

        stage('Terraform Init') {
            steps {
                dir(env.TERRAFORM_DIR) {
                    script {
                        withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                            if (isUnix()) {
                                sh "export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && terraform init"
                            } else {
                                bat "set AWS_ACCESS_KEY_ID=%AWS_ACCESS_KEY_ID% && set AWS_SECRET_ACCESS_KEY=%AWS_SECRET_ACCESS_KEY% && terraform init"
                            }
                        }
                    }
                }
            }
        }

        stage('Terraform Plan') {
        steps {
            dir(env.TERRAFORM_DIR) {
                script {
                    def planArgs = "-var aws_region=${env.AWS_REGION} -var aws_account_id=${env.AWS_ACCOUNT_ID} -var api_image=${env.API_IMAGE_URI} -var frontend_image=${env.FRONT_IMAGE_URI} -var client_origins=${env.CLIENT_ORIGINS} -var frontend_url=${env.FRONTEND_URL} -var service_desired_count=${env.SERVICE_DESIRED_COUNT}"
                    withCredentials([string(credentialsId: 'mongo-uri', variable: 'MONGO_URI'),
                                     string(credentialsId: 'JWT_SECRET', variable: 'JWT_SECRET'),
                                     string(credentialsId: 'JWT_REFRESH_SECRET', variable: 'JWT_REFRESH_SECRET')]) {
                        def secretArgs = " -var 'mongo_uri=${MONGO_URI}' -var 'jwt_secret=${JWT_SECRET}' -var 'jwt_refresh_secret=${JWT_REFRESH_SECRET}'"
                        if (isUnix()) {
                            sh "terraform plan ${planArgs}${secretArgs} -out=tfplan"
                        } else {
                            bat "terraform plan ${planArgs}${secretArgs} -out=tfplan"
                            }
                        }
                    }
                }
            }
        }   

        stage('Terraform Apply') {
            steps {
                dir(env.TERRAFORM_DIR) {
                    script {
                        withCredentials([usernamePassword(credentialsId: 'AWS', usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY')]) {
                            if (isUnix()) {
                                sh "export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && terraform apply -input=false -auto-approve tfplan"
                            } else {
                                bat "set AWS_ACCESS_KEY_ID=%AWS_ACCESS_KEY_ID% && set AWS_SECRET_ACCESS_KEY=%AWS_SECRET_ACCESS_KEY% && terraform apply -input=false -auto-approve tfplan"
                            }
                        }
                    }
                }
            }
        }
    }
}
