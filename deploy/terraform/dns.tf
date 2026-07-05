# Hosted zone for your domain. After `apply`, point the domain's name servers
# (at your registrar, or in Route53 → Registered domains) at the outputs'
# route53_name_servers, then Caddy will get a Let's Encrypt cert automatically.
resource "aws_route53_zone" "main" {
  name = var.root_domain
}

resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = local.app_domain
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
}
