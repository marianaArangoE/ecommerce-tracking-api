variable "aws_region" {
  description = "AWS region where the resources will be deployed."
  type        = string
  default     = "us-east-2"
}

variable "aws_account_id" {
  description = "AWS account ID used for ECR image repository URLs."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "api_image" {
  description = "Full ECR image URI for the API service."
  type        = string
}

variable "frontend_image" {
  description = "Full ECR image URI for the frontend service."
  type        = string
}

variable "mongo_uri" {
  description = "MongoDB connection string used by the API."
  type        = string
  default     = ""
}

variable "jwt_secret" {
  description = "JWT access secret for the API."
  type        = string
  default     = ""
}

variable "jwt_refresh_secret" {
  description = "JWT refresh secret for the API."
  type        = string
  default     = ""
}

variable "client_origins" {
  description = "Allowed CORS origins for the API."
  type        = string
  default     = "*"
}

variable "frontend_url" {
  description = "Frontend URL for the API service."
  type        = string
  default     = ""
}

variable "smtp_host" {
  description = "SMTP host used by the API email service."
  type        = string
  default     = "smtp.gmail.com"
}

variable "smtp_port" {
  description = "SMTP port used by the API email service."
  type        = string
  default     = "587"
}

variable "smtp_user" {
  description = "SMTP username for the API email service."
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password for the API email service."
  type        = string
  default     = ""
}

variable "service_desired_count" {
  description = "Number of desired Fargate tasks per service."
  type        = number
  default     = 1
}
