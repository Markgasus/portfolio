import React, { useEffect } from 'react'; // Import useEffect
import { Container, Typography, Box, Grid, Button } from '@mui/material'; // Import Button
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
      title: "Toontown Rewritten",
      logo: process.env.PUBLIC_URL + "/assets/TTR.png?v=1",
      description: "Designed and implemented client and server-side gameplay functionality and systems for a large-scale MMO powered by Astron, Panda3D, and Python, serving over 2 million registered users and supporting thousands of concurrent players.",
      skills: [
        { name: "Python", image: process.env.PUBLIC_URL + "/assets/Python.png" },
        { name: "Panda3D", image: process.env.PUBLIC_URL + "/assets/Panda3D.png" },
        { name: "Astron", image: process.env.PUBLIC_URL + "/assets/Astron.png" },
      ],
    },
    toontag: {
      title: "Disney's Toon Tag Attraction Recreation",
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
      description: "A faithful recreation of the classic ToonTag attraction once located inside EPCOT in the late 1990s and early 2000s, this project captures the nostalgic atmosphere of Disney’s Internet Zone. Built in Unreal Engine using C++ and Blueprints, the online multiplayer experience allows players to step into the world as a Unreal MetaHuman character, freely explore the venue, and approach interactive ToonTag arcade cabinets to seamlessly join real-time Tag matches with other players. The project emphasizes smooth gameplay and robust network replication, with core systems developed in C++ and gameplay logic implemented through Blueprints. Additionally, 3D assets were carefully ported and optimized from the original Panda3D engine into Unreal Engine via Autodesk Maya—preserving the authentic feel while delivering a modernized experience.",
      skills: [
        { name: "Unreal Engine", image: process.env.PUBLIC_URL + "/assets/UnrealEngine.png" },
        { name: "C++", image: process.env.PUBLIC_URL + "/assets/C++.png" },
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

  return (
    <Box sx={{ minHeight: '100vh', py: 5, backgroundColor: 'background.default', color: 'text.primary' }}>
      <Container component={motion.div} initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.5 } } }}>
        {/* Centered Project Content */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '800px', mx: 'auto' }}>
          <img 
            src={project.logo} 
            alt={project.title} 
            style={{ 
              width: '60%', 
              height: 'auto', 
              marginBottom: '2rem' 
            }} 
          />
          {/* optional media items (images or videos) displayed beneath logo in a 2x2 grid */}
          {project.media && Array.isArray(project.media) && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                width: '100%',
                justifyItems: 'center',
                mb: 4,
              }}
            >
              {project.media.map((m, idx) => (
                <React.Fragment key={idx}>
                  {m.type === 'image' && (
                    <img
                      src={m.src}
                      alt={`${project.title} screenshot ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: 'auto',
                      }}
                    />
                  )}
                  {m.type === 'video' && (
                    <video
                      controls
                      src={m.src}
                      style={{
                        width: '100%',
                        height: 'auto',
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>
          )}

          {/* project title or section heading inserted before description */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              mb: 2,
              textAlign: 'left',
              width: '100%',
            }}
          >
            {project.title}
          </Typography>

          <Typography variant="body1" sx={{ mb: 4, textAlign: 'left' }}>{project.description}</Typography>
          
          <Box sx={{ width: '100%' }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                textDecoration: 'underline',
                textUnderlineOffset: '5px',
                fontWeight: 'bold',
                textAlign: 'left',
                alignSelf: 'flex-start'
              }}
            >
              Technologies Used
            </Typography>
            <Grid container spacing={2} justifyContent="flex-start" sx={{ maxWidth: '400px' }}>
              {project.skills.map((skill, index) => (
                <Grid item xs={4} sm={3} key={index} display="flex" flexDirection="column" alignItems="center">
                  <img src={skill.image} alt={skill.name} style={{ width: '50px', height: '50px' }} />
                  <Typography variant="body2" sx={{ textAlign: 'center', fontSize: '1.1rem' }}>{skill.name}</Typography>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>

        {/* Back to Home Button */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button variant="contained" onClick={() => navigate('/')}> {/* Adapted for HashRouter */}
            Back to Home
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default ProjectDetail;
