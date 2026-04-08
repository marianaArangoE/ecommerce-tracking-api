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
    }
}
