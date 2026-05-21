output "load_balancer_dns_name" {
  description = "The DNS name of the application load balancer."
  value       = aws_lb.http.dns_name
}

output "frontend_url" {
  description = "URL of the frontend service."
  value       = "http://${aws_lb.http.dns_name}"
}

output "api_url" {
  description = "URL of the API service root path."
  value       = "http://${aws_lb.http.dns_name}/api"
}

output "ecr_api_repository_url" {
  description = "ECR repository URL for the API image."
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR repository URL for the frontend image."
  value       = aws_ecr_repository.frontend.repository_url
}
