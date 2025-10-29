import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCardHistory } from '../../api.js';
import { Card, CardBody } from '../../ui/Card.jsx';
import Button from '../../ui/Button.jsx';
import Loader from '../../ui/Loader.jsx';
import Badge from '../../ui/Badge.jsx';
import Table from '../../ui/Table.jsx';

export default function CardHistoryPage() {
  const { cardId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(20);

  const fetchHistory = useCallback(async () => {
    if (!cardId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCardHistory(cardId, limit);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load card history');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cardId, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const getEventTypeBadge = (eventType) => {
    const variants = {
      'CLUSTER_VISIT': 'accent',
      'REGISTRATION': 'success', 
      'EXIT': 'warning',
      'OTHER': 'default'
    };
    return <Badge variant={variants[eventType] || 'default'}>{eventType}</Badge>;
  };

  const historyColumns = [
    {
      key: 'log_time',
      header: 'Time',
      render: (row) => formatDateTime(row.log_time)
    },
    {
      key: 'event_type',
      header: 'Event',
      render: (row) => getEventTypeBadge(row.event_type)
    },
    {
      key: 'label',
      header: 'Label',
      render: (row) => <code className="text-sm">{row.label}</code>
    },
    {
      key: 'portal',
      header: 'Portal',
      render: (row) => row.portal || '—'
    }
  ];

  if (!cardId) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardBody>
            <div className="text-center text-red-400">
              Card ID is required
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Card History</h1>
          <p className="text-white/60">Complete tap history for card: <code className="text-cyan-400">{cardId}</code></p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>← Back</Button>
          <Button onClick={fetchHistory} disabled={loading}>
            {loading ? <Loader size="sm" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardBody>
            <div className="text-red-400">
              <strong>Error:</strong> {error}
            </div>
          </CardBody>
        </Card>
      )}

      {loading && !data && (
        <Card>
          <CardBody>
            <div className="flex items-center gap-3">
              <Loader />
              <span>Loading card history...</span>
            </div>
          </CardBody>
        </Card>
      )}

      {data && (
        <>
          {/* Card Details */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Card Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Status</div>
                  <Badge variant={data.cardDetails?.status === 'assigned' ? 'success' : 'default'}>
                    {data.cardDetails?.status || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Registration ID</div>
                  <div className="font-mono text-sm">
                    {data.cardDetails?.registration_id || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Team Name</div>
                  <div>{data.cardDetails?.team_name || '—'}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Group Size</div>
                  <div>{data.cardDetails?.group_size || '—'}</div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Statistics */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-semibold mb-4">Activity Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">{data.statistics.totalTaps}</div>
                  <div className="text-sm text-white/60">Total Taps</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{data.statistics.clusterVisits}</div>
                  <div className="text-sm text-white/60">Cluster Visits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{data.statistics.registrations}</div>
                  <div className="text-sm text-white/60">Registrations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{data.statistics.exits}</div>
                  <div className="text-sm text-white/60">Exits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{data.clustersVisited.length}</div>
                  <div className="text-sm text-white/60">Unique Clusters</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-white/60 mb-1">First/Last Seen</div>
                  <div className="text-xs">
                    {data.statistics.firstSeen ? formatDateTime(data.statistics.firstSeen).split(' ')[1] : '—'}
                    <br />
                    {data.statistics.lastSeen ? formatDateTime(data.statistics.lastSeen).split(' ')[1] : '—'}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Clusters Visited */}
          {data.clustersVisited.length > 0 && (
            <Card>
              <CardBody>
                <h2 className="text-lg font-semibold mb-4">Clusters Visited</h2>
                <div className="flex flex-wrap gap-2">
                  {data.clustersVisited.map(cluster => (
                    <Badge key={cluster} variant="accent">
                      {cluster}
                    </Badge>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* History Table */}
          <Card>
            <CardBody>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Tap History</h2>
                <div className="flex items-center gap-3">
                  <select 
                    value={limit} 
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm"
                  >
                    <option value={10}>10 records</option>
                    <option value={20}>20 records</option>
                    <option value={50}>50 records</option>
                    <option value={100}>100 records</option>
                  </select>
                  {data.pagination.hasMore && (
                    <Badge variant="warning">Showing {data.pagination.returned} of many</Badge>
                  )}
                </div>
              </div>
              
              {data.history.length > 0 ? (
                <Table 
                  data={data.history} 
                  columns={historyColumns}
                />
              ) : (
                <div className="text-center text-white/60 py-8">
                  No tap history found for this card
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}