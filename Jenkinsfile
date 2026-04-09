// Job Jenkins: un solo repositorio en "Pipeline script from SCM" → solo la API, rama main, Script Path: Jenkinsfile
// No añadas el repo del front en la misma pantalla Git (evita "Multiple candidate revisions" y checkout en origin1/main).
// Credencial Git del front: por defecto "Github"; sobreescribe con variable de entorno GIT_FRONT_CREDENTIALS en el job.
pipeline {
    agent any

    tools {
        nodejs 'Node-22'
    }

    environment {
        DIR_FRONT = 'ecommerce-tracking-front'
        GIT_FRONT_URL = 'https://github.com/Juank0017/ecommerce-tracking-front.git'
        GIT_FRONT_CREDENTIALS = "${env.GIT_FRONT_CREDENTIALS ?: 'Github'}"
        VITE_API_URL = "${env.VITE_API_URL ?: 'http://localhost:3000'}"
    }

    stages {
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

        stage('API: Install dependencies') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node -v && npm -v && npm ci'
                    } else {
                        bat 'node -v && npm -v && npm ci'
                    }
                }
            }
        }

        stage('API: Tests') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'npx jest --coverage --runInBand'
                    } else {
                        bat 'npx jest --coverage --runInBand'
                    }
                }
            }
        }

        stage('Docker: Stop stacks') {
            steps {
                script {
                    ['.', env.DIR_FRONT].each { subdir ->
                        dir(subdir) {
                            if (isUnix()) {
                                sh 'docker compose down -v || true'
                            } else {
                                bat 'docker compose down -v'
                            }
                        }
                    }
                }
            }
        }

        stage('Docker: Start API stack') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker compose up --build -d'
                    } else {
                        bat 'docker compose up --build -d'
                    }
                }
            }
        }

        stage('Docker: Start Frontend stack') {
            steps {
                dir(env.DIR_FRONT) {
                    withEnv(["VITE_API_URL=${env.VITE_API_URL}"]) {
                        script {
                            if (isUnix()) {
                                sh 'docker compose up --build -d'
                            } else {
                                bat 'docker compose up --build -d'
                            }
                        }
                    }
                }
            }
        }

        stage('Docker: Verify') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'docker ps'
                    } else {
                        bat 'docker ps'
                    }
                }
            }
        }
    }
}
