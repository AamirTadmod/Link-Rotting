import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container,
    Box,
    Paper,
    Typography,
    CircularProgress,
    Alert,
    AlertTitle,
    Grid,
    Link,
    Chip,
    Stack,
    Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LinkIcon from '@mui/icons-material/Link';
import ScheduleIcon from '@mui/icons-material/Schedule';

const API_URL = 'http://localhost:3001/api/links';

const formatLastChecked = (dateString) => {
    if (!dateString) return 'Never Checked';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    });
};

const LinkStatusDisplay = ({ link }) => {
    let StatusIcon = ScheduleIcon;
    let statusColor = 'default';
    let statusText = link.status;

    if (link.status.startsWith('OK')) {
        StatusIcon = CheckCircleOutlineIcon;
        statusColor = 'success';
    } else if (link.status.startsWith('Soft 404')) {
        StatusIcon = WarningAmberIcon;
        statusColor = 'warning';
    } else if (link.status.startsWith('Failed') || link.status.includes('Error')) {
        StatusIcon = ErrorOutlineIcon;
        statusColor = 'error';
    } else {
        StatusIcon = RefreshIcon;
    }

    const WarningChip = () => (
        <Chip
            label={link.linkRotWarning ? '❗ WARNING' : 'Link Stable'}
            color={link.linkRotWarning ? 'error' : 'success'}
            variant={link.linkRotWarning ? 'filled' : 'outlined'}
            sx={{
                fontWeight: 'bold',
                ...(link.linkRotWarning && {
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                        '0%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.7)' },
                        '70%': { boxShadow: '0 0 0 10px rgba(220, 38, 38, 0)' },
                        '100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0)' },
                    },
                }),
            }}
        />
    );

    return (
        <Paper
            elevation={4}
            sx={{
                p: 3,
                borderRadius: 2,
                borderLeft: '8px solid',
                borderColor: 'primary.main',
                transition: '0.3s',
                '&:hover': {
                    boxShadow: 8,
                },
            }}
        >
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6} lg={7}>
                    <Chip
                        label={link.category.toUpperCase()}
                        size="small"
                        sx={{ mb: 1, backgroundColor: 'primary.light', color: 'primary.dark', fontWeight: 'bold' }}
                    />
                    <Typography variant="h6" component="h3" gutterBottom>
                        <Link
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            underline="hover"
                            color="text.primary"
                            sx={{ fontWeight: 'bold' }}
                            title={`View document: ${link.title}`}
                        >
                            {link.title}
                        </Link>
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1 }}>
                        <LinkIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {link.url}
                        </Typography>
                    </Stack>
                </Grid>

                <Grid item xs={12} md={6} lg={5}>
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={{ xs: 2, sm: 1, md: 3 }}
                        alignItems={{ xs: 'flex-start', sm: 'center' }}
                        justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    >
                        <Chip
                            icon={<StatusIcon />}
                            label={statusText}
                            color={statusColor}
                            variant="soft"
                            sx={{ fontWeight: '600', minWidth: 120 }}
                        />

                        <WarningChip />

                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <AccessTimeIcon fontSize="small" color="action" />
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                                Checked: {formatLastChecked(link.lastChecked)}
                            </Typography>
                        </Stack>
                    </Stack>
                </Grid>
            </Grid>
        </Paper>
    );
};

const App = () => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchLinks = async () => {
        if (!links.length) setLoading(true);
        setError(null);
        try {
            const response = await axios.get(API_URL);
            setLinks(response.data);
            console.log('Links fetched successfully, total:', response.data.length);
        } catch (err) {
            console.error('Error fetching links from backend:', err.message);
            setError('Failed to fetch data. Ensure the Node.js server is running on port 3001.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
        const intervalId = setInterval(fetchLinks, 10000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50', py: 4, fontFamily: 'Inter, sans-serif' }}>
            <Container maxWidth="lg">
                <Box mb={5}>
                    <Typography variant="h3" component="h1" fontWeight="extrabold" color="text.primary" display="flex" alignItems="center">
                        <Box component="span" sx={{ width: 40, height: 40, bgcolor: 'primary.main', borderRadius: 1, mr: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            IP
                        </Box>
                        IP Rights Reference Hub
                    </Typography>
                    <Typography variant="h5" color="text.secondary" mt={1}>
                        Active Monitoring of IP India Document Links
                    </Typography>
                    <Alert severity="info" variant="filled" sx={{ mt: 3, borderLeft: '4px solid', borderColor: 'primary.light' }}>
                        <AlertTitle>Backend Status</AlertTitle>
                        Updates are persisted in MongoDB. Link checks run every hour via <code>node-cron</code>.
                    </Alert>
                </Box>

                {loading && !links.length ? (
                    <Paper elevation={2} sx={{ p: 5, display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: 'white' }}>
                        <CircularProgress color="primary" size={30} />
                        <Typography variant="h6" color="text.secondary" ml={2}>
                            Connecting to database and fetching status...
                        </Typography>
                    </Paper>
                ) : error ? (
                    <Alert severity="error" variant="filled" sx={{ p: 3 }}>
                        <AlertTitle>Connection Error</AlertTitle>
                        {error}
                    </Alert>
                ) : (
                    <Box component="main">
                        <Typography variant="h4" fontWeight="bold" color="text.secondary" mb={3}>
                            Monitored Documents ({links.length})
                        </Typography>
                        <Stack spacing={2}>
                            {links.map((link) => (
                                <LinkStatusDisplay key={link._id} link={link} />
                            ))}
                        </Stack>
                    </Box>
                )}

                <Box mt={6} pt={2}>
                    <Divider />
                    <Typography variant="body2" color="text.disabled" align="center" mt={1}>
                        Frontend data refresh cycle: 10 seconds.
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default App;