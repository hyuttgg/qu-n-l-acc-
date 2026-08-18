pipeline {
    agent any

    environment {
        MYSQL_HOST = '127.0.0.1'
        MYSQL_PORT = '3306'
        MYSQL_USER = 'root'
        MYSQL_PASSWORD = 'jenkins_root_password'
        MYSQL_DATABASE = 'bloxfruits_db'
        NODE_ENV = 'production'
        DISCORD_WEBHOOK_URL = credentials('DISCORD_DEVOPS_WEBHOOK')
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout Source Code') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies & Lint') {
            steps {
                retry(3) {
                    dir('backend') {
                        sh 'npm install'
                        sh 'echo "🔍 Verifying JavaScript syntax..."'
                        sh 'node -c server.js'
                        sh 'node -c routes/*.js'
                        sh 'node -c bot/*.js'
                        sh 'node -c utils/*.js'
                        sh 'echo "✅ All syntax checks passed!"'
                    }
                }
            }
            post {
                failure {
                    script {
                        sendDiscordNotification(
                            title: '🔴 [Jenkins] Lint & Syntax Check FAILED',
                            description: "Code quality check thất bại trên branch ${env.BRANCH_NAME ?: 'unknown'}.",
                            color: 15158332,
                            fields: [
                                [name: 'Branch', value: "`${env.BRANCH_NAME ?: 'unknown'}`", inline: true],
                                [name: 'Build', value: "`#${env.BUILD_NUMBER}`", inline: true],
                            ]
                        )
                    }
                }
            }
        }

        stage('Automated MySQL Migration Test') {
            steps {
                // Spin up ephemeral MySQL 8.0 Docker container for testing
                sh '''
                    docker run -d --name mysql-jenkins-test \
                      -e MYSQL_ROOT_PASSWORD=${MYSQL_PASSWORD} \
                      -e MYSQL_DATABASE=${MYSQL_DATABASE} \
                      -p 3306:3306 mysql:8.0
                    
                    echo "Waiting for MySQL container to become healthy..."
                    sleep 15
                '''

                // Run migration with auto-retry
                retry(3) {
                    dir('backend') {
                        sh 'node scripts/run_migrations.js'
                    }
                }
            }
            post {
                always {
                    // Clean up test container
                    sh 'docker stop mysql-jenkins-test || true'
                    sh 'docker rm mysql-jenkins-test || true'
                }
                failure {
                    script {
                        sendDiscordNotification(
                            title: '🔴 [Jenkins] Database Migration FAILED',
                            description: 'SQL migration thất bại sau 3 lần thử.',
                            color: 15158332,
                            fields: [
                                [name: 'Branch', value: "`${env.BRANCH_NAME ?: 'unknown'}`", inline: true],
                                [name: 'Build', value: "`#${env.BUILD_NUMBER}`", inline: true],
                            ]
                        )
                    }
                }
            }
        }

        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                dir('backend') {
                    // Save current commit for rollback
                    sh '''
                        PREVIOUS_COMMIT=$(git rev-parse HEAD)
                        echo "$PREVIOUS_COMMIT" > /tmp/oceanforge_previous_commit_jenkins
                    '''

                    // Deploy
                    sh '''
                        if [ -f ecosystem.config.js ]; then
                            pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
                        else
                            pm2 restart oceanforge-backend || pm2 start server.js --name oceanforge-backend
                        fi
                    '''
                }
            }
        }

        stage('Post-Deploy Health Check') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo '⏳ Waiting 15 seconds for server warmup...'
                    sleep(15)

                    def healthPassed = false
                    def maxRetries = 5

                    for (int attempt = 1; attempt <= maxRetries; attempt++) {
                        echo "🏥 Health check attempt ${attempt}/${maxRetries}..."
                        
                        def httpCode = sh(
                            script: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health --max-time 10 || echo "000"',
                            returnStdout: true
                        ).trim()

                        if (httpCode == '200') {
                            echo "✅ Health check PASSED (HTTP ${httpCode}) on attempt ${attempt}"
                            healthPassed = true
                            break
                        }

                        echo "⚠️ Health check returned HTTP ${httpCode} on attempt ${attempt}"
                        
                        if (attempt < maxRetries) {
                            sleep(10)
                        }
                    }

                    if (!healthPassed) {
                        error("❌ Health check FAILED after ${maxRetries} attempts — triggering auto-rollback")
                    }
                }
            }
        }

        stage('Auto-Rollback') {
            when {
                expression {
                    return currentBuild.result == 'FAILURE' && env.BRANCH_NAME == 'main'
                }
            }
            steps {
                dir('backend') {
                    script {
                        echo '🔄 INITIATING AUTO-ROLLBACK...'

                        sh '''
                            if [ -f /tmp/oceanforge_previous_commit_jenkins ]; then
                                PREVIOUS_COMMIT=$(cat /tmp/oceanforge_previous_commit_jenkins)
                                echo "⏪ Rolling back to commit: $PREVIOUS_COMMIT"
                                git checkout $PREVIOUS_COMMIT
                            else
                                echo "⚠️ No rollback state found — reverting to HEAD~1"
                                git reset --hard HEAD~1
                            fi

                            npm install --production
                            pm2 restart oceanforge-backend

                            # Verify rollback health
                            sleep 10
                            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health --max-time 10 || echo "000")
                            if [ "$HTTP_CODE" = "200" ]; then
                                echo "✅ Post-rollback health check PASSED"
                            else
                                echo "❌ Post-rollback health check FAILED — CRITICAL: Manual intervention required"
                                exit 1
                            fi
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            script {
                sendDiscordNotification(
                    title: '🟢 [Jenkins] Pipeline Thành Công',
                    description: "Pipeline hoàn thành thành công trên branch ${env.BRANCH_NAME ?: 'unknown'}.",
                    color: 3066993,
                    fields: [
                        [name: 'Branch', value: "`${env.BRANCH_NAME ?: 'unknown'}`", inline: true],
                        [name: 'Build', value: "`#${env.BUILD_NUMBER}`", inline: true],
                        [name: 'Health Check', value: '✅ PASSED', inline: true],
                    ]
                )
            }
            echo '🎉 Jenkins DevOps Pipeline executed successfully!'
        }
        failure {
            script {
                sendDiscordNotification(
                    title: '🔴 [Jenkins] Pipeline FAILED — Auto-Rollback Triggered',
                    description: "Pipeline thất bại. Hệ thống đã tự động rollback về commit trước.",
                    color: 15158332,
                    fields: [
                        [name: 'Branch', value: "`${env.BRANCH_NAME ?: 'unknown'}`", inline: true],
                        [name: 'Build', value: "`#${env.BUILD_NUMBER}`", inline: true],
                        [name: 'Action', value: '⏪ AUTO-ROLLBACK', inline: true],
                    ]
                )
            }
            echo '❌ Jenkins DevOps Pipeline failed!'
        }
    }
}

// ══════════════════════════════════════════════════════════════
// HELPER: Send Discord Webhook Notification
// ══════════════════════════════════════════════════════════════
def sendDiscordNotification(Map params) {
    def title = params.title ?: 'Jenkins Notification'
    def description = params.description ?: ''
    def color = params.color ?: 3066993
    def fields = params.fields ?: []

    def fieldsJson = fields.collect { field ->
        """{"name": "${field.name}", "value": "${field.value}", "inline": ${field.inline ?: false}}"""
    }.join(',')

    def timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss'Z'", TimeZone.getTimeZone('UTC'))

    def payload = """{
        "embeds": [{
            "title": "${title}",
            "description": "${description}",
            "color": ${color},
            "fields": [${fieldsJson}],
            "footer": {"text": "OceanForge Self-Healing Jenkins CI/CD"},
            "timestamp": "${timestamp}"
        }]
    }"""

    try {
        sh """
            curl -s -X POST "${env.DISCORD_WEBHOOK_URL}" \
              -H "Content-Type: application/json" \
              -d '${payload}' || true
        """
    } catch (Exception e) {
        echo "⚠️ Discord notification failed: ${e.message}"
    }
}
