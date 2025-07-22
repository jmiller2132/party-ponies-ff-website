import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, setDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';

// Define global variables for Firebase configuration, provided by the Canvas environment
// These variables are automatically injected by the environment where this code runs.
// If running locally, you might need to mock them or provide your own Firebase config.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Main App component
const App = () => {
  // State to manage which tab is currently active (e.g., 'dashboard', 'standings')
  const [activeTab, setActiveTab] = useState('dashboard');

  // Firebase related states
  const [db, setDb] = useState(null); // Firestore database instance
  const [auth, setAuth] = useState(null); // Firebase Auth instance
  const [userId, setUserId] = useState(null); // Current authenticated user's ID
  const [isAuthReady, setIsAuthReady] = useState(false); // Flag to indicate if Firebase Auth has initialized

  // State for storing news items fetched from Firestore
  const [news, setNews] = useState([]);
  // States for the input fields when adding a new news item
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');

  // New states for historical data and constitution
  const [historicalStandings, setHistoricalStandings] = useState([]);
  const [constitutionContent, setConstitutionContent] = useState('');
  const [isEditingConstitution, setIsEditingConstitution] = useState(false);
  const [newConstitutionContent, setNewConstitutionContent] = useState('');

  // useEffect hook to initialize Firebase and set up authentication listener.
  // This runs only once when the component mounts due to the empty dependency array [].
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (error) {
            console.error("Firebase authentication error:", error);
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []); // Empty dependency array means this effect runs once on mount

  // Fetch news items from Firestore
  useEffect(() => {
    if (db && isAuthReady) {
      const newsCollectionPath = `artifacts/${appId}/public/data/news`;
      const newsQuery = query(collection(db, newsCollectionPath), orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(newsQuery, (snapshot) => {
        const newsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setNews(newsData);
      }, (error) => {
        console.error("Error fetching news:", error);
      });

      return () => unsubscribe();
    }
  }, [db, isAuthReady, appId]);

  // Fetch historical standings from Firestore
  useEffect(() => {
    if (db && isAuthReady) {
      const historicalStandingsCollectionPath = `artifacts/${appId}/public/data/historicalStandings`;
      // Order by year in descending order to show most recent first
      const historicalStandingsQuery = query(collection(db, historicalStandingsCollectionPath), orderBy('year', 'desc'));

      const unsubscribe = onSnapshot(historicalStandingsQuery, (snapshot) => {
        const standingsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setHistoricalStandings(standingsData);
      }, (error) => {
        console.error("Error fetching historical standings:", error);
      });

      return () => unsubscribe();
    }
  }, [db, isAuthReady, appId]);

  // Fetch league constitution from Firestore
  useEffect(() => {
    if (db && isAuthReady) {
      const constitutionDocPath = `artifacts/${appId}/public/data/leagueConstitution/document`;
      const docRef = doc(db, constitutionDocPath);

      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setConstitutionContent(docSnap.data().content || '');
          setNewConstitutionContent(docSnap.data().content || ''); // Initialize editor with current content
        } else {
          setConstitutionContent('No constitution found. Click "Edit" to add one!');
          setNewConstitutionContent('');
        }
      }, (error) => {
        console.error("Error fetching constitution:", error);
      });

      return () => unsubscribe();
    }
  }, [db, isAuthReady, appId]);


  // Handle adding a new news item
  const handleAddNews = async () => {
    if (!newNewsTitle || !newNewsContent) {
      console.log("Title and content cannot be empty.");
      return;
    }
    if (!db || !userId) {
      console.log("Firestore not initialized or user not authenticated.");
      return;
    }

    try {
      const newsCollectionRef = collection(db, `artifacts/${appId}/public/data/news`);
      await addDoc(newsCollectionRef, {
        title: newNewsTitle,
        content: newNewsContent,
        timestamp: serverTimestamp(),
        authorId: userId,
      });
      setNewNewsTitle('');
      setNewNewsContent('');
      console.log("News added successfully!");
    } catch (error) {
      console.error("Error adding news:", error);
    }
  };

  // Handle saving the constitution
  const handleSaveConstitution = async () => {
    if (!db || !userId) {
      console.log("Firestore not initialized or user not authenticated.");
      return;
    }

    try {
      const constitutionDocRef = doc(db, `artifacts/${appId}/public/data/leagueConstitution/document`);
      await setDoc(constitutionDocRef, {
        content: newConstitutionContent,
        lastUpdated: serverTimestamp(),
        updatedBy: userId,
      });
      setIsEditingConstitution(false);
      console.log("Constitution saved successfully!");
    } catch (error) {
      console.error("Error saving constitution:", error);
    }
  };

  // Placeholder data for the current league season (can be replaced by Firestore data later)
  const leagueData = {
    name: "Party Ponies FF League", // Changed to your league name!
    currentWeek: 1,
    teams: [
      { id: 1, name: "Team A", manager: "Alice", wins: 1, losses: 0, ties: 0, pointsFor: 120, pointsAgainst: 90 },
      { id: 2, name: "Team B", manager: "Bob", wins: 0, losses: 1, ties: 0, pointsFor: 95, pointsAgainst: 110 },
      { id: 3, name: "Team C", manager: "Charlie", wins: 1, losses: 0, ties: 0, pointsFor: 115, pointsAgainst: 85 },
      { id: 4, name: "Team D", manager: "Diana", wins: 0, losses: 1, ties: 0, pointsFor: 88, pointsAgainst: 105 },
    ],
    schedule: [
      { week: 1, homeTeam: "Team A", awayTeam: "Team B", homeScore: 120, awayScore: 95 },
      { week: 1, homeTeam: "Team C", awayTeam: "Team D", homeScore: 115, awayScore: 88 },
    ]
  };

  // Navbar component
  const Navbar = () => (
    <nav className="bg-gray-800 p-4 rounded-t-lg shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-white text-2xl font-bold">
          {leagueData.name}
        </h1>
        <div className="flex space-x-4">
          <NavItem tabName="dashboard" label="Dashboard" />
          <NavItem tabName="standings" label="Current Standings" />
          <NavItem tabName="schedule" label="Current Schedule" />
          <NavItem tabName="teams" label="Teams & Managers" />
          <NavItem tabName="news" label="League News" />
          <NavItem tabName="history" label="League History" /> {/* New Nav Item */}
          <NavItem tabName="constitution" label="Constitution" /> {/* New Nav Item */}
        </div>
      </div>
    </nav>
  );

  // NavItem component
  const NavItem = ({ tabName, label }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`px-4 py-2 rounded-md transition-colors duration-200
        ${activeTab === tabName ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
    >
      {label}
    </button>
  );

  // Dashboard component
  const Dashboard = () => (
    <div className="p-6 bg-white rounded-b-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">League Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Current Week" value={leagueData.currentWeek} />
        <StatCard title="Total Teams" value={leagueData.teams.length} />
        <StatCard title="Upcoming Games" value={leagueData.schedule.filter(s => s.week === leagueData.currentWeek).length} />
      </div>
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Latest News & Updates</h3>
        {news.length > 0 ? (
          <ul className="list-disc list-inside text-gray-700">
            {news.slice(0, 3).map((item) => (
              <li key={item.id} className="mb-2">
                <span className="font-semibold">{item.title}:</span> {item.content}
                <span className="text-sm text-gray-500 ml-2">
                  ({item.timestamp ? new Date(item.timestamp.toDate()).toLocaleDateString() : 'N/A'})
                </span>
              </li>
            ))}
            {news.length > 3 && (
              <li className="text-blue-600 hover:underline cursor-pointer" onClick={() => setActiveTab('news')}>
                View all news...
              </li>
            )}
          </ul>
        ) : (
          <p className="text-gray-600">No news updates yet. Be the first to add one!</p>
        )}
      </div>
    </div>
  );

  // Reusable Stat Card component
  const StatCard = ({ title, value }) => (
    <div className="bg-blue-50 p-6 rounded-lg shadow-md text-center">
      <h4 className="text-lg font-medium text-blue-700 mb-2">{title}</h4>
      <p className="text-4xl font-bold text-blue-900">{value}</p>
    </div>
  );

  // Standings component
  const Standings = () => {
    const sortedTeams = [...leagueData.teams].sort((a, b) => {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.pointsFor - a.pointsFor;
    });

    return (
      <div className="p-6 bg-white rounded-b-lg shadow-lg">
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">Current League Standings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Rank</th>
                <th className="py-3 px-6 text-left">Team Name</th>
                <th className="py-3 px-6 text-left">Manager</th>
                <th className="py-3 px-6 text-left">W</th>
                <th className="py-3 px-6 text-left">L</th>
                <th className="py-3 px-6 text-left">T</th>
                <th className="py-3 px-6 text-left">PF</th>
                <th className="py-3 px-6 text-left">PA</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 text-sm font-light">
              {sortedTeams.map((team, index) => (
                <tr key={team.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{index + 1}</td>
                  <td className="py-3 px-6 text-left">{team.name}</td>
                  <td className="py-3 px-6 text-left">{team.manager}</td>
                  <td className="py-3 px-6 text-left">{team.wins}</td>
                  <td className="py-3 px-6 text-left">{team.losses}</td>
                  <td className="py-3 px-6 text-left">{team.ties}</td>
                  <td className="py-3 px-6 text-left">{team.pointsFor}</td>
                  <td className="py-3 px-6 text-left">{team.pointsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Schedule component
  const Schedule = () => (
    <div className="p-6 bg-white rounded-b-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">Current Schedule & Results</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Week</th>
              <th className="py-3 px-6 text-left">Home Team</th>
              <th className="py-3 px-6 text-left">Score</th>
              <th className="py-3 px-6 text-left">Away Team</th>
              <th className="py-3 px-6 text-left">Score</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm font-light">
            {leagueData.schedule.map((game, index) => (
              <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-6 text-left">{game.week}</td>
                <td className="py-3 px-6 text-left">{game.homeTeam}</td>
                <td className="py-3 px-6 text-left font-bold">{game.homeScore}</td>
                <td className="py-3 px-6 text-left">{game.awayTeam}</td>
                <td className="py-3 px-6 text-left font-bold">{game.awayScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Teams component
  const Teams = () => (
    <div className="p-6 bg-white rounded-b-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">Teams & Managers</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leagueData.teams.map(team => (
          <div key={team.id} className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{team.name}</h3>
            <p className="text-gray-700">Manager: <span className="font-medium">{team.manager}</span></p>
            <p className="text-gray-600 text-sm mt-2">
              Record: {team.wins}-{team.losses}-{team.ties}
            </p>
            <p className="text-gray-600 text-sm">
              Points For: {team.pointsFor}, Points Against: {team.pointsAgainst}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  // LeagueNews component
  const LeagueNews = () => (
    <div className="p-6 bg-white rounded-b-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">League News & Updates</h2>

      {userId && (
        <p className="text-sm text-gray-500 mb-4">
          Current User ID: <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
        </p>
      )}

      <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-inner">
        <h3 className="text-2xl font-semibold text-blue-800 mb-4">Add New News Item</h3>
        <input
          type="text"
          placeholder="News Title"
          value={newNewsTitle}
          onChange={(e) => setNewNewsTitle(e.target.value)}
          className="w-full p-3 mb-3 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <textarea
          placeholder="News Content"
          value={newNewsContent}
          onChange={(e) => setNewNewsContent(e.target.value)}
          rows="4"
          className="w-full p-3 mb-4 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
        ></textarea>
        <button
          onClick={handleAddNews}
          className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors duration-200 font-bold shadow-md"
        >
          Publish News
        </button>
      </div>

      <div className="mt-8">
        {news.length > 0 ? (
          <div className="space-y-6">
            {news.map((item) => (
              <div key={item.id} className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-700 mb-3">{item.content}</p>
                <p className="text-sm text-gray-500">
                  Published: {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleString() : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No news items found. Add one above!</p>
        )}
      </div>
    </div>
  );

  // New Component: League History (for historical standings)
  const LeagueHistory = () => (
    <div className="p-6 bg-white rounded-b-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">League History (Past Standings)</h2>

      {/* Instructions for adding historical data */}
      <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 rounded">
        <p className="font-bold">How to Add Historical Data:</p>
        <p className="text-sm">
          Currently, you'll need to add historical standings directly via the Firebase Console.
          Go to your Firestore database, find the collection `artifacts/{appId}/public/data/historicalStandings`,
          and add documents. Each document should represent a year and contain an array of team objects.
        </p>
        <p className="text-sm mt-2">
          **Example Document Structure for a year (e.g., "2023"):**
        </p>
        <pre className="bg-yellow-100 p-2 rounded text-xs mt-1 overflow-x-auto">
          {`{
  "year": 2023,
  "standings": [
    { "name": "Party Ponies", "manager": "You", "wins": 10, "losses": 3, "ties": 0, "championship": true },
    { "name": "Gridiron Gurus", "manager": "Alex", "wins": 9, "losses": 4, "ties": 0, "championship": false }
    // ... more teams
  ],
  "championshipTeam": "Party Ponies" // Optional: Name of the champion for quick display
}`}
        </pre>
      </div>

      {historicalStandings.length > 0 ? (
        <div className="space-y-8">
          {historicalStandings.map((yearData) => (
            <div key={yearData.id} className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">
                {yearData.year} Season
                {yearData.championshipTeam && (
                  <span className="ml-3 text-green-600 text-xl font-bold">
                    Champion: {yearData.championshipTeam}
                  </span>
                )}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">Rank</th>
                      <th className="py-3 px-6 text-left">Team Name</th>
                      <th className="py-3 px-6 text-left">Manager</th>
                      <th className="py-3 px-6 text-left">W</th>
                      <th className="py-3 px-6 text-left">L</th>
                      <th className="py-3 px-6 text-left">T</th>
                      {/* Add more columns as needed for historical data */}
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 text-sm font-light">
                    {yearData.standings && yearData.standings.sort((a,b) => b.wins - a.wins).map((team, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-6 text-left whitespace-nowrap">{index + 1}</td>
                        <td className="py-3 px-6 text-left">{team.name}</td>
                        <td className="py-3 px-6 text-left">{team.manager}</td>
                        <td className="py-3 px-6 text-left">{team.wins}</td>
                        <td className="py-3 px-6 text-left">{team.losses}</td>
                        <td className="py-3 px-6 text-left">{team.ties || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No historical standings found. Add some via Firebase Console!</p>
      )}
    </div>
  );

  // New Component: League Constitution
  const LeagueConstitution = () => (
    <div className="p-6 bg-white rounded-b-lg shadow-lg">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 border-b pb-3">Party Ponies FF League Constitution</h2>

      {userId && (
        <p className="text-sm text-gray-500 mb-4">
          Current User ID: <span className="font-mono bg-gray-100 p-1 rounded">{userId}</span>
        </p>
      )}

      {isEditingConstitution ? (
        <div className="mb-8 p-6 bg-green-50 rounded-lg shadow-inner">
          <h3 className="text-2xl font-semibold text-green-800 mb-4">Edit Constitution</h3>
          <textarea
            value={newConstitutionContent}
            onChange={(e) => setNewConstitutionContent(e.target.value)}
            rows="15"
            className="w-full p-3 mb-4 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
            placeholder="Write your league's constitution here..."
          ></textarea>
          <div className="flex space-x-4">
            <button
              onClick={handleSaveConstitution}
              className="flex-1 bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors duration-200 font-bold shadow-md"
            >
              Save Constitution
            </button>
            <button
              onClick={() => {
                setIsEditingConstitution(false);
                setNewConstitutionContent(constitutionContent); // Revert changes
              }}
              className="flex-1 bg-gray-400 text-white py-3 rounded-md hover:bg-gray-500 transition-colors duration-200 font-bold shadow-md"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg shadow-md border border-gray-200 whitespace-pre-wrap">
          {constitutionContent || <p className="text-gray-600">No constitution content available. Click "Edit" to add it!</p>}
          <div className="mt-6 text-right">
            <button
              onClick={() => setIsEditingConstitution(true)}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 font-bold shadow-md"
            >
              Edit Constitution
            </button>
          </div>
        </div>
      )}
    </div>
  );


  // Function to render the correct component based on the active tab
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'standings':
        return <Standings />;
      case 'schedule':
        return <Schedule />;
      case 'teams':
        return <Teams />;
      case 'news':
        return <LeagueNews />;
      case 'history':
        return <LeagueHistory />; // New case for League History
      case 'constitution':
        return <LeagueConstitution />; // New case for League Constitution
      default:
        return <Dashboard />; // Default to Dashboard
    }
  };

  // Main App component rendering
  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        <Navbar />
        {renderContent()}
      </div>
    </div>
  );
};

export default App;