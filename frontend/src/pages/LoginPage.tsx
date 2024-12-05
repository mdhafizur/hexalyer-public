import { Box } from '@mui/material'
import React from 'react'

export default function LoginPage() {
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        bgcolor: "background.default", // Using custom background color from theme
      }}
    >
      Login Page
    </Box>
  )
}
