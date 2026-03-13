pipeline {
    agent any
        tools {
        nodejs 'Node'
    }
    stages 
    {
        stage ('Install Dependencies'){
            steps{
                echo 'Starting init'
                script {
                    if (isUnix()){
                        sh 'npm install'
                    }
                    else {
                        bat 'npm install'
                    }
                }
            }
        }
        stage ('Run Jest Test'){
            steps{
                echo 'Starting running tests'
                script {
                    if (isUnix()){
                        sh 'npx --jest coverage'
                    }
                    else {
                        bat 'npx --jest coverage'
                    }
                }
            }
        }    
        stage ('Down Containers'){
            steps{
                echo 'Starting down containers'
                script {
                    if (isUnix()){
                        sh 'docker compose down -v'
                    }
                    else {
                        bat 'docker compose down -v'
                    }
                }
            }
        }    
        stage ('Build and Up Containers'){
            steps{
                echo 'Starting running docker compose'
                script {
                    if (isUnix()){
                        sh 'docker compose up --build -d'
                    }
                    else {
                        bat 'docker compose up --build -d'
                    }
                }
            }
        }    
    }
}
