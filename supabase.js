const supabaseUrl = 'https://zhjmdttihcqjokfixocp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoam1kdHRpaGNxam9rZml4b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzYwNzcsImV4cCI6MjA1MDIxMjA3N30._GGCsLog4X_LqpCF-jQOmNksPmtJhIujlNeND--IrJk';

// Create Supabase client using the global object
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

export async function getHighScores() {
    const { data, error } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error('Error fetching high scores:', error);
        return [];
    }

    // Format the created_at date for each score
    return data.map(score => ({
        ...score,
        formattedDate: new Date(score.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }),
        formattedTime: new Date(score.created_at).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }));
}

export async function addHighScore(initials, score, level) {
    const { error } = await supabase
        .from('high_scores')
        .insert([{ 
            initials, 
            score, 
            level,
            created_at: new Date().toISOString()
        }]);
    
    if (error) {
        console.error('Error adding high score:', error);
        return false;
    }
    return true;
}
