pipeline {
    agent any

    tools {
        nodejs 'Node-22'
    }

    environment {
        DIR_API = 'ecommerce-tracking-api'
        DIR_FRONT = 'ecommerce-tracking-front'
        VITE_API_URL = "${env.VITE_API_URL ?: 'http://localhost:3000'}"
    }

    stages {
        stage('API: Install dependencies') {
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

        stage('API: Tests') {
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

        stage('Docker: Stop stacks') {
            steps {
                script {
                    [env.DIR_API, env.DIR_FRONT].each { subdir ->
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
                dir(env.DIR_API) {
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
