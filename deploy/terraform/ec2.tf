resource "aws_security_group" "app" {
  name        = "${var.project}-app"
  description = "Web (Caddy) — HTTP/HTTPS in; optional SSH"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP (ACME challenge + redirect to HTTPS)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH only if you explicitly opt in. Otherwise use SSM Session Manager.
  dynamic "ingress" {
    for_each = var.ssh_allowed_cidr == null ? [] : [var.ssh_allowed_cidr]
    content {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Stable public IP so DNS doesn't break on instance replacement.
resource "aws_eip" "app" {
  domain = "vpc"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.ubuntu.value
  instance_type          = var.instance_type
  subnet_id              = element(tolist(data.aws_subnets.default.ids), 0)
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  key_name               = var.key_name

  user_data = templatefile("${path.module}/templates/user-data.sh.tftpl", {
    region            = var.region
    bucket            = aws_s3_bucket.artifacts.bucket
    ssm_path          = local.ssm_path
    app_domain        = local.app_domain
    forge_deploy_b64  = base64encode(file("${path.module}/files/forge-deploy.sh"))
    forge_service_b64 = base64encode(file("${path.module}/files/forge.service"))
    caddyfile_b64     = base64encode(file("${path.module}/files/Caddyfile"))
  })

  root_block_device {
    volume_type = "gp3"
    volume_size = 20
    encrypted   = true
  }

  metadata_options {
    http_tokens   = "required" # enforce IMDSv2
    http_endpoint = "enabled"
  }

  tags = { Name = "${var.project}-app" }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
