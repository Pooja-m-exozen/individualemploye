pipeline {
    agent any

   

    stages {
        stage('Checkout') {
            steps {
                // Use the correct repository URL and credentials
                git branch: 'main', url: 'https://github.com/Pooja-m-exozen/individualemploye.git', credentialsId: 'GithubPAT'
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    // Build the Docker image
                    sh 'docker build -t individual_employe_image .'
                }
            }
        }

        stage('Stop Existing Container') {
            steps {
                script {
                    // Stop and remove the existing container if it exists
                    sh 'docker stop newrbacfrontendcontainer || true'
                    sh 'docker rm newrbacfrontendcontainer || true'
                }
            }
        }

        stage('Run Docker Container') {
            steps {
                script {
                    // Run the Docker container with volumes for photos and QR codes
                    sh '''
                    docker run -d --name newrbacfrontendcontainer -p 3010:3000 \
                      --network bridge \
                      individual_employe_image
                    '''
                }
            }
        }
    }

    post {
        always {
            // Clean up workspace
            cleanWs()
        }
    }
}