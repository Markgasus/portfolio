import React, { useEffect } from 'react'; // Import useEffect
import { Container, Typography, Box, Grid, Button } from '@mui/material'; // Import Button
import '../index.css';
import ParticleBackground from './ParticleBackground';
import { useParams, useNavigate } from 'react-router-dom'; // Import useNavigate
import { motion } from 'framer-motion';

const ProjectDetail = () => {
  // Scroll to the top on component mount
  useEffect(() => {
    window.scrollTo(0, 0); // Scroll to the top of the page on component mount
  }, []);

  // Navigate function
  const navigate = useNavigate(); // Initialize useNavigate

  // Project data
  const projectData = {
    TTR: {
      logo: process.env.PUBLIC_URL + "/assets/TTR.png?v=1",
      skills: [
        { name: "Python", image: process.env.PUBLIC_URL + "/assets/Python.png" },
        { name: "Panda3D", image: process.env.PUBLIC_URL + "/assets/panda3d.png" },
        { name: "Astron", image: process.env.PUBLIC_URL + "/assets/Astron.png" },
      ],
      sections: [
        {
          title: 'What is Toontown Rewritten?',
          text: 'Toontown is a classic MMO that I grew up with. When Disney shut it down in 2013, it felt like losing a piece of my childhood, so the community decided to bring it back to life! In Toontown, you create your own Toon character and battle the "Cogs", corporate robots trying to ruin all the fun!',
          image: process.env.PUBLIC_URL + '/assets/TTR_screenshot.jpg',
        },
        {
          title: 'Game Development',
          text: 'I work on Toontown gameplay, making the client and server communicate in real-time. I code in Python with Panda3D, use Astron for networking, and spend most of my time in PyCharm writing and debugging. I work on enhancing legacy Toontown code, applying OOP principles, and ensuring the codebase stays organized.',
          image: process.env.PUBLIC_URL + '/assets/TTR_Dev.png',
        },
        {
          title: 'Panda3D Game Engine',
          text: 'Panda3D challenges me as a programmer in a way most modern engines don\'t — no editor, no click and drag, no visual helpers, everything is strictly done through code. It\'s nothing like Unity or Unreal, but that challenge is what makes it so rewarding and has made me think a lot deeper about game development as a whole.',
          image: process.env.PUBLIC_URL + '/assets/TTR_Panda.png',
        },
      ],
    },
    toontag: {
      logo: process.env.PUBLIC_URL + "/assets/Toon_Tag.png?v=1",
      media: [
        {
          type: 'image',
          src: process.env.PUBLIC_URL + '/assets/Internet_Zone.jpg',
        },
        {
          type: 'image',
          src: process.env.PUBLIC_URL + '/assets/Cabinet.jpg',
        },
      ],
      skills: [
        { name: "Unreal Engine", image: process.env.PUBLIC_URL + "/assets/UnrealEngine.png" },
        { name: "C++", image: process.env.PUBLIC_URL + "/assets/C++.png" },
      ],
      sections: [
        {
          title: 'Overview',
          text: 'A faithful recreation of the classic ToonTag attraction from EPCOT’s Internet Zone era.',
          image: process.env.PUBLIC_URL + '/assets/Internet_Zone.jpg',
        },
        {
          title: 'Gameplay',
          text: 'Built as an online multiplayer experience with real-time Tag matches and replicated gameplay systems.',
          image: process.env.PUBLIC_URL + '/assets/Cabinet.jpg',
        },
        {
          title: 'Pipeline',
          text: 'Ported and optimized assets from Panda3D into Unreal Engine through Autodesk Maya workflows.',
          image: process.env.PUBLIC_URL + '/assets/Toon_Tag_Key_Art.png',
        },
      ],
    },
  };

  // Get project ID from URL
  const { projectId } = useParams();
  const project = projectData[projectId];

  // Handle project not found
  if (!project) {
    return <Typography variant="h5" sx={{ textAlign: 'center', py: 5 }}>Project not found.</Typography>;
  }

  const sections = project.sections;

  return (
    <Box sx={{ minHeight: '100vh', py: 5, backgroundColor: 'transparent', color: 'text.primary' }}>
      <ParticleBackground />
      <Container maxWidth="xl" component={motion.div} initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } }}>
        <Grid container spacing={4} alignItems="flex-start" justifyContent="center">
          <Grid item xs={12} md={10}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <img
                className="floating-avatar"
                src={project.logo}
                alt="Project logo"
                style={{
                  width: '100%',
                  maxWidth: 500,
                  height: 'auto',
                  marginBottom: '1rem',
                  alignSelf: 'center',
                }}
              />

              
              {/* Three descriptive boxes with images */}
              <Box sx={{ mt: 3 }}>
                <Grid container spacing={3} justifyContent="center">
                  {sections.map((section, i) => {
                    return (
                      <Grid item xs={12} sm={6} md={4} key={i}>
                        <Box sx={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 2, overflow: 'hidden' }}>
                          <img src={section.image} alt={`${section.title} image`} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
                          <Box sx={{ p: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: '700', mb: 1, textAlign: 'left' }}>{section.title}</Typography>
                            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'left' }}>{section.text}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>

              {/* Skills left-aligned under content */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'flex-start', width: '100%', mt: 2 }}>
                {project.skills.map((skill, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', padding: '8px 12px', borderRadius: 8 }}>
                    <img src={skill.image} alt={skill.name} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'left' }}>{skill.name}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Back button centered (moved from sidebar) */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Button variant="contained" onClick={() => navigate('/')}>Back to Home</Button>
              </Box>

            </Box>
          </Grid>

          
        </Grid>
      </Container>
    </Box>
  );
};

export default ProjectDetail;
