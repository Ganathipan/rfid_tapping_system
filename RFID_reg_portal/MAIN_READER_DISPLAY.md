# Main Reader Display System

## 🎯 Updated Setup

**Display shows scores ONLY when tapping the main reader, NOT secondary readers.**

### Reader Configuration
- **Cluster 1**: Display at `reader1` (main), `reader1a`, `reader1b` (secondary)
- **Cluster 2**: Display at `reader2` (main), `reader2a`, `reader2b` (secondary)  
- **Cluster 3**: Display at `reader3` (main), `reader3a` (secondary)
- **Cluster 4**: Display at `reader4` (main), `reader4a` (secondary)

## 🔄 How It Works

### Main Reader (with Display)
1. **Player taps** `reader1` (main reader)
2. **Display shows** popup with points earned
3. **Team score updates** in real-time
4. **Recent taps** shows in display

### Secondary Readers (no Display)
1. **Player taps** `reader1a` or `reader1b` (secondary readers)
2. **Points are scored** and team score updates
3. **NO popup** appears on display
4. **NO recent taps** shown on display
5. **Silent scoring** - points count but no visual feedback

## 🎮 User Experience

### For Players at Main Reader
- **Tap RFID card** on main reader
- **See popup** with points earned
- **View team score** updates
- **See recent taps** from main reader

### For Players at Secondary Readers
- **Tap RFID card** on secondary reader
- **Points are scored** silently
- **No visual feedback** on display
- **Team score still updates** (can be checked later)

## 🔧 Technical Implementation

### API Endpoints

#### Main Reader: `POST /api/tags/rfid-detected`
- **Triggers**: Display popup and score update
- **Used by**: Main readers only
- **Response**: Includes display message

#### Secondary Reader: `POST /api/tags/rfid-tap-secondary`
- **Triggers**: Score update only (no display)
- **Used by**: Secondary readers only
- **Response**: Silent scoring confirmation

### Frontend Logic
```javascript
// Only main reader triggers display
const mainReader = `reader${currentCluster.replace('cluster', '')}`;

// Secondary readers use different endpoint
// (handled by hardware integration)
```

## 📊 Database Behavior

### All Readers (Main + Secondary)
- **Logs tap** in database
- **Updates team score** 
- **Prevents duplicate** taps
- **Records which reader** was used

### Main Reader Only
- **Triggers display popup**
- **Shows in recent taps**
- **Updates display UI**

## 🎯 Benefits

### For Players
- **Clear feedback** at main reader
- **Silent scoring** at secondary readers
- **No confusion** about which reader to use for display
- **All taps count** toward team score

### For Setup
- **One display per cluster** (cost effective)
- **Multiple tapping points** (convenient)
- **Clear distinction** between display and non-display readers
- **Flexible reader placement**

## 🧪 Testing

### Test Main Reader
1. Select "Cluster 1 Display"
2. Type `RFID001` and press Enter
3. Should show popup: "+10 points! Total: 20"
4. Should appear in recent taps

### Test Secondary Reader (Simulation)
1. Use API directly: `POST /api/tags/rfid-tap-secondary`
2. Body: `{"rfid":"RFID002","portal":"reader1a"}`
3. Should return success but no display popup
4. Team score should still update

## 🚀 Production Setup

### Hardware Configuration
1. **Install main reader** with display screen
2. **Install secondary readers** without displays
3. **Connect main reader** to display system
4. **Connect secondary readers** to scoring system only

### Software Configuration
1. **Main reader** calls `/api/tags/rfid-detected`
2. **Secondary readers** call `/api/tags/rfid-tap-secondary`
3. **Display** only shows main reader activity
4. **Scoring** works for all readers

## 📱 UI Updates

### Cluster Selection
- Shows "Main: reader1, Others: reader1a, reader1b"
- Clear indication of which reader has display

### Display Information
- "Display shows scores only when tapping the main reader"
- "Only taps on the main reader will show on this display"

### Recent Taps
- Shows "Recent Taps on Main Reader (reader1)"
- Only displays taps from main reader

## 🔍 Troubleshooting

### Common Issues
1. **No popup on main reader**: Check if using correct endpoint
2. **Points not scoring on secondary**: Check secondary endpoint
3. **Display not updating**: Verify main reader connection
4. **Wrong reader behavior**: Check API endpoint configuration

### Debug Steps
1. Check which endpoint is being called
2. Verify reader type (main vs secondary)
3. Check database logs for tap records
4. Verify team score updates

The system now works exactly as you requested - display only shows scores when tapping the main reader, while secondary readers score silently!

