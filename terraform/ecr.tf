resource "aws_ecr_repository" "api" {
  name                 = "ecommerce-tracking-api"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "ecommerce-tracking-api"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "ecommerce-tracking-front"
  image_tag_mutability = "MUTABLE"

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "ecommerce-tracking-front"
  }
}
