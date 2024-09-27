const socket = io();
let sessionId = new URLSearchParams(window.location.search).get('sessionId');
let username = sessionStorage.getItem('username');  // Get the username from sessionStorage
let isHost = false;
let votesRevealed = false;  // Flag for showing votes

function joinGame() {
    if (!username) {
        // If no username is found, redirect back to the join page
        window.location.href = `/join.html?sessionId=${sessionId}`;
    } else {
        // Emit the join event with sessionId and username
        socket.emit('join', { sessionId, username });
        document.getElementById('cards').classList.remove('hidden');
    }
}

socket.on('players', players => {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '';  // Clear the display

    players.forEach(player => {
        let playerClass = 'not-voted';  // Default class for non-voted players
        let playerStatus = 'Not voted';

        if (player.estimate !== null) {
            playerClass = 'voted';  // Change class when voted
            playerStatus = 'Voted';
        }

        // Display the player's name and voting status (not the actual vote)
        playersDiv.innerHTML += `
            <div class="player-card ${playerClass}">
                <span>${player.username}</span>
                <span>${playerStatus}</span>  <!-- Only show voting status -->
            </div>
        `;
    });
});

socket.on('host', () => {
    isHost = true;
    document.getElementById('host-controls').classList.remove('hidden');
});

socket.on('results', players => {
    votesRevealed = true;  // Set flag to show votes
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '';  // Clear and re-render with votes revealed

    // Clear previous results
    const voteResultsDiv = document.getElementById('vote-results');
    voteResultsDiv.innerHTML = '';

    const voteCounts = {};
    const allVotes = [];

    players.forEach(player => {
        const vote = player.estimate;
        if (vote !== null) {
            if (!voteCounts[vote]) {
                voteCounts[vote] = 0;
            }
            voteCounts[vote]++;
            allVotes.push(vote); // Collect all votes for average calculation
        }
    });

    // Convert the voteCounts object into an array and sort by number of votes
    const sortedResults = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

    // Display sorted results
    sortedResults.forEach(([point, count]) => {
        voteResultsDiv.innerHTML += `<li>${count} votes for ${point}</li>`;
    });

    // Unhide the results container
    document.getElementById('results-container').classList.remove('hidden');

    // Display each player's vote
    players.forEach(player => {
        playersDiv.innerHTML += `
            <div class="player-card voted">
                <span>${player.username}</span>
                <span>${player.estimate !== null ? player.estimate : 'Waiting...'}</span>
            </div>
        `;
    });

    // Calculate average
    const sum = allVotes.reduce((acc, vote) => acc + vote, 0);
    const avg = (sum / allVotes.length).toFixed(2);
    document.getElementById('average-vote').innerText = avg;

    // Check for consensus (all players must vote the same)
    const uniqueVotes = [...new Set(allVotes)];
    if (uniqueVotes.length === 1) {
        document.getElementById('consensus-status').innerText = 'Consensus!';
        document.getElementById('consensus-status').style.color = 'green';
    } else {
        document.getElementById('consensus-status').innerText = 'No consensus';
        document.getElementById('consensus-status').style.color = 'red';
    }
});

function sendEstimate(value) {
    socket.emit('estimate', { sessionId, username, estimate: value });
}

function showVotes() {
    socket.emit('showVotes', sessionId);
}

function clearVotes() {
    votesRevealed = false;  // Reset the votesRevealed flag for the next round
    socket.emit('clearVotes', sessionId);  // Notify the backend to reset votes for all players

    // Clear the player display (keep players, but reset vote status to "Not voted")
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '';  // Clear the current display

    // Clear the results display
    const voteResultsDiv = document.getElementById('vote-results');
    voteResultsDiv.innerHTML = '';  // Clear vote results

    // Reset statistics
    document.getElementById('average-vote').innerText = '0';
    document.getElementById('consensus-status').innerText = 'No consensus';
    document.getElementById('consensus-status').style.color = 'black';

    // Hide the results container
    document.getElementById('results-container').classList.add('hidden');

    // Re-render the player list with the "Not voted" status after clearing votes
    socket.emit('players', session.players);  // Re-fetch the players and update UI
}

// Listen for clearVotes event from the server and reset the UI for all clients
socket.on('clearVotes', (players) => {
    votesRevealed = false;  // Reset the votesRevealed flag for all players

    // Clear the player display
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '';  // Clear the current display

    // Re-render the players with "Not voted" status
    players.forEach(player => {
        playersDiv.innerHTML += `
            <div class="player-card not-voted">
                <span>${player.username}</span>
                <span>Not voted</span>
            </div>
        `;
    });

    // Clear the results display
    const voteResultsDiv = document.getElementById('vote-results');
    voteResultsDiv.innerHTML = '';  // Clear vote results

    // Reset statistics
    document.getElementById('average-vote').innerText = '0';
    document.getElementById('consensus-status').innerText = 'No consensus';
    document.getElementById('consensus-status').style.color = 'black';

    // Hide the results container
    document.getElementById('results-container').classList.add('hidden');
});
