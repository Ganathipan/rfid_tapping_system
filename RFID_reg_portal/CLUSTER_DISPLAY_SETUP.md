# Cluster Display Setup Guide

## 🎯 Your Setup Plan

You want to place **one RFID reader with a display screen** in each cluster, but have **multiple readers per cluster**. The display will show scores for all taps from any reader in that cluster.

### Example Setup:
- **Cluster 1**: Display at `reader1`, also has `reader1a`, `reader1b`
- **Cluster 2**: Display at `reader2`, also has `reader2a`, `reader2b`  
- **Cluster 3**: Display at `reader3`, also has `reader3a`
- **Cluster 4**: Display at `reader4`, also has `reader4a`

## 🚀 Quick Setup

### 1. Database Setup
```bash
# Run the schema first
psql -d your_database -f Database/schema.sql

# Then add test data
psql -d your_database -f test_data.sql
```

### 2. Start Backend
```bash
cd Backend
npm start
```

### 3. Start Frontend
```bash
cd frontend
npm run dev
```

## 🎮 How It Works

### Display Setup
1. **Open Game Interface** on the display screen
2. **Select Cluster** (e.g., "Cluster 1 Display")
3. **System monitors** all readers in that cluster:
   - `reader1`, `reader1a`, `reader1b` for Cluster 1
   - `reader2`, `reader2a`, `reader2b` for Cluster 2
   - etc.

### RFID Tapping
1. **Player taps** any reader in the cluster
2. **System detects** which reader was used
3. **Display shows** popup with points earned
4. **Team score updates** in real-time
5. **Recent taps** shows which reader was used

## 📊 Test Data Included

### Teams by Cluster
- **Cluster 1**: Royal College (4 members), Ananda College (2 members)
- **Cluster 2**: Trinity College (3 members), St. Anthony's College (4 members)  
- **Cluster 3**: Richmond College (2 members)

### RFID Cards
- **RFID001-RFID004**: Royal College team
- **RFID005-RFID007**: Trinity College team
- **RFID008-RFID009**: Ananda College team
- **RFID010-RFID011**: Richmond College team
- **RFID012-RFID015**: St. Anthony's College team

### Sample Taps
- Taps from various readers (`reader1`, `reader1a`, `reader1b`, etc.)
- Different clusters with different point values
- Recent activity for testing

## 🧪 Testing Instructions

### Test 1: Basic Cluster Display
1. Open Game Interface
2. Select "Cluster 1 Display"
3. Type `RFID001` and press Enter
4. Should show popup: "+10 points! Total: 20 (via reader1)"

### Test 2: Multiple Readers
1. Stay on Cluster 1 Display
2. Type `RFID002` and press Enter
3. Should show popup: "+10 points! Total: 30 (via reader1a)"
4. Check "Recent Taps" section shows both taps

### Test 3: Different Clusters
1. Switch to "Cluster 2 Display"
2. Type `RFID005` and press Enter
3. Should show popup: "+20 points! Total: 60 (via reader2)"
4. Team score should be different from Cluster 1

### Test 4: Error Handling
1. Type `INVALID_RFID` and press Enter
2. Should show error popup for 2 seconds
3. No score should be added

## 🎨 UI Features

### Cluster Selection
- Dropdown shows all clusters with their readers
- Clear indication of which readers are monitored
- Easy switching between clusters

### Display Information
- **Current Cluster**: Shows which cluster this display is for
- **Team Score**: Large, prominent score display
- **Recent Taps**: Shows last 5 taps with reader info
- **Status**: Shows if system is ready or listening

### Popup System
- **Success**: Green popup with points earned
- **Error**: Red popup with error message
- **Reader Info**: Shows which reader detected the tap
- **Auto-hide**: Success after 1 second, errors after 2 seconds

## 🔧 Backend Logic

### Reader Detection
```javascript
// Try multiple readers for the cluster
const readers = [
  `reader${clusterNumber}`,
  `reader${clusterNumber}a`, 
  `reader${clusterNumber}b`
];

// Try each reader until one responds
for (const reader of readers) {
  // Process tap with this reader
}
```

### Cluster Mapping
- `reader1`, `reader1a`, `reader1b` → `cluster1`
- `reader2`, `reader2a`, `reader2b` → `cluster2`
- `reader3`, `reader3a` → `cluster3`
- `reader4`, `reader4a` → `cluster4`

## 📱 Frontend Features

### Real-time Updates
- **Team Score**: Updates immediately after tap
- **Recent Taps**: Shows last 5 taps with details
- **Popup Display**: Instant feedback for each tap
- **Status Indicator**: Shows system state

### Visual Design
- **Modern UI**: Gradient backgrounds and glass effects
- **Responsive**: Works on different screen sizes
- **Clear Information**: Easy to read scores and status
- **Interactive**: Smooth animations and transitions

## 🚀 Production Deployment

### Hardware Setup
1. **Place readers** in each cluster location
2. **Install display** with one reader per cluster
3. **Connect readers** to backend system
4. **Configure cluster** selection on each display

### Software Setup
1. **Deploy backend** to production server
2. **Deploy frontend** to display devices
3. **Configure database** with production data
4. **Test all readers** in each cluster

## 🎯 Benefits

### For Players
- **Easy tapping** - any reader in cluster works
- **Instant feedback** - see points immediately
- **Clear scoring** - know exactly what happened

### For Admins
- **Centralized display** - one screen per cluster
- **Multiple readers** - more tapping points
- **Real-time monitoring** - see all activity
- **Easy management** - simple cluster selection

## 🔍 Troubleshooting

### Common Issues
1. **No response**: Check if RFID is assigned to team
2. **Wrong cluster**: Verify cluster selection on display
3. **Database errors**: Ensure tables are created
4. **Network issues**: Check backend connectivity

### Debug Steps
1. Check backend logs for errors
2. Verify database connection
3. Test API endpoints manually
4. Check frontend console for errors

The system is now perfectly set up for your cluster display plan! Each display will monitor all readers in its cluster and show real-time scores for any taps.

