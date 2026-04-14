import React from 'react';
import { Box, Container, Grid, Typography, Link, IconButton, Stack, Divider } from '@mui/material';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'About Us',
      links: [
        { label: 'Our Story', href: '#' },
        { label: 'Careers', href: '#' },
        { label: 'Blog', href: '#' },
        { label: 'Press', href: '#' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help Center', href: '#' },
        { label: 'Contact Us', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Sitemap', href: '#' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Service', href: '#' },
        { label: 'Privacy Policy', href: '#' },
        { label: 'Cookie Policy', href: '#' },
        { label: 'Compliance', href: '#' },
      ],
    },
  ];

  return (
    <Box component="footer" sx={{ bgcolor: '#1D3557', color: 'white', pt: 10, pb: 6 }}>
      <Container maxWidth="lg">
        <Grid container spacing={8}>
           <Grid xs={12} md={3}>
              <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: -1, color: 'white', mb: 3 }}>
                 THE <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500 }}>KINETIC</Box> CURATOR
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, mb: 4 }}>
                 Pioneering the future of gourmet delivery with real-time geospatial intelligence and curated culinary experiences.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                {[FacebookIcon, TwitterIcon, InstagramIcon, LinkedInIcon].map((Icon, i) => (
                  <IconButton key={i} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}>
                    <Icon fontSize="inherit" />
                  </IconButton>
                ))}
              </Stack>
           </Grid>

          {footerSections.map((section) => (
            <Grid key={section.title} xs={6} md={2}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'white', mb: 3, letterSpacing: 1 }}>
                {section.title.toUpperCase()}
              </Typography>
              <Stack spacing={1.5}>
                {section.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    underline="none"
                    sx={{
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: '0.2s',
                      '&:hover': { color: 'white', transform: 'translateX(4px)' },
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
              </Stack>
            </Grid>
          ))}

          {/* App Installation */}
          <Grid xs={12} md={3}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'white', mb: 3, letterSpacing: 1 }}>
              EXPERIENCE MOBILE
            </Typography>
            <Stack spacing={2}>
              <Box
                component="img"
                src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                sx={{ width: 140, cursor: 'pointer', filter: 'brightness(0) invert(1)', opacity: 0.8, '&:hover': { opacity: 1 } }}
              />
              <Box
                component="img"
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                sx={{ width: 160, cursor: 'pointer', filter: 'brightness(0) invert(1)', opacity: 0.8, '&:hover': { opacity: 1 } }}
              />
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 8, borderColor: 'rgba(255,255,255,0.05)' }} />

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
            &copy; {currentYear} THE KINETIC CURATOR. ALL RIGHTS RESERVED.
          </Typography>
          <Box sx={{ display: 'flex', gap: 4 }}>
            <Link href="#" variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textDecoration: 'none', '&:hover': { color: 'white' } }}>PRIVACY POLICY</Link>
            <Link href="#" variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textDecoration: 'none', '&:hover': { color: 'white' } }}>TERMS OF SERVICE</Link>
            <Link href="#" variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontWeight: 700, textDecoration: 'none', '&:hover': { color: 'white' } }}>ACCESSIBILITY</Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
