pipeline {
    agent any

    tools {
        nodejs 'Node'
    }

    stages {
        stage('Install Dependencies') {
            steps {
                echo 'Starting init'
                script {
                    if (isUnix()) {
                        sh 'node -v'
                        sh 'npm -v'
                        sh 'npm install'
                    } else {
                        bat 'node -v'
                        bat 'npm -v'
                        bat 'npm install'
                    }
                }
            }
        }

        stage('Run Jest Test') {
            steps {
                echo 'Starting running tests'
                script {
                    if (isUnix()) {
                        sh 'npx jest --coverage --runInBand'
                    } else {
                        bat 'npx jest --coverage --runInBand'
                    }
                }
            }
        }

        stage('Down Containers') {
            steps {
                echo 'Stopping previous containers'
                script {
                    if (isUnix()) {
                        sh 'docker compose down -v || true'
                    } else {
                        bat 'docker compose down -v'
                    }
                }
            }
        }

        stage('Build and Up Containers') {
            steps {
                echo 'Starting docker compose'
                script {
                    if (isUnix()) {
                        sh 'docker compose up --build -d'
                    } else {
                        bat 'docker compose up --build -d'
                    }
                }
            }
        }

        stage('Verify Containers') {
            steps {
                echo 'Verifying running containers'
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
