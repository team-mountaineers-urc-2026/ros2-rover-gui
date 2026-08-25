import React from 'react';
import { NavLink } from 'react-router-dom';

const NavBar = () => {
  const styles = {
    navbar: {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      border: 'none',
      color: 'white',
      // width: '10px',

    },
    NavLink: {
      color: 'white',
      fontSize: '16px',
      width: '100%', 
      height: '100%',
      textDecoration: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      transition: 'background-color 0.3s ease',
      writingMode: 'vertical-rl',
      transform: 'rotate(180deg)',
      
    },
    NavLinkActive: {
      color: 'white',

    },
  };

  const handleMouseEnter = (e) => {
    e.currentTarget.style.backgroundColor = 'white';
    e.currentTarget.style.color = 'gray'
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.backgroundColor = 'var(--bg-sidebar-left)';
    e.currentTarget.style.color = 'white'
  };

  return (
    <nav style={styles.navbar}>
      <NavLink
        to="/"
        style={({ isActive }) =>
          isActive ? { ...styles.NavLink, ...styles.NavLinkActive } : styles.NavLink
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Home
      </NavLink>
      <NavLink
        to="/Cameras"
        style={({ isActive }) =>
          isActive ? { ...styles.NavLink, ...styles.NavLinkActive } : styles.NavLink
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Cameras
      </NavLink>
      <NavLink
        to="/Map"
        style={({ isActive }) =>
          isActive ? { ...styles.NavLink, ...styles.NavLinkActive } : styles.NavLink
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Map
      </NavLink>
      <NavLink
        to="/Science"
        style={({ isActive }) =>
          isActive ? { ...styles.NavLink, ...styles.NavLinkActive } : styles.NavLink
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Science
      </NavLink>
      <NavLink
        to="/Manipulator"
        style={({ isActive }) =>
          isActive ? { ...styles.NavLink, ...styles.NavLinkActive } : styles.NavLink
        }
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        Manipulator
      </NavLink>
    </nav>
  );
};

export default NavBar;
