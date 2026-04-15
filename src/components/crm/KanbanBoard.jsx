import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Phone, MapPin, DollarSign, Calendar, AlertCircle } from 'lucide-react';

const COLUMNS = [
  { id: 'lead', label: 'Lead', color: 'border-t-purple-500', badge: 'bg-purple-100 text-purple-700' },
  { id: 'estimate', label: 'Estimate', color: 'border-t-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500', badge: 'bg-blue-100 text-blue-700' },
  { id: 'paid', label: 'Paid ✓', color: 'border-t-green-500', badge: 'bg-green-100 text-green-700' },
  { id: 'cancelled', label: 'Cancelled', color: 'border-t-red-400', badge: 'bg-red-100 text-red-600' },
];

const PRIORITY_DOT = { low: 'bg-gray-400', medium: 'bg-orange-400', high: 'bg-red-500' };

export default function KanbanBoard({ jobs, onStatusChange, onJobClick }) {
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = jobs.filter(j => (j.status || 'lead') === col.id);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    const job = jobs.find(j => j.id === draggableId);
    if (job && job.status !== newStatus) {
      onStatusChange(job.id, newStatus);
    }
  };

  const colTotal = (colId) =>
    grouped[colId]?.reduce((s, j) => s + (j.total_price || j.grand_total || 0), 0) || 0;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[60vh]">
        {COLUMNS.map(col => (
          <div key={col.id} className="flex-shrink-0 w-64">
            {/* Column header */}
            <div className={`bg-card rounded-t-lg border-t-4 ${col.color} px-3 py-2 border border-border`}>
              <div className="flex items-center justify-between">
                <span className="font-heading font-semibold text-sm">{col.label}</span>
                <Badge variant="secondary" className="text-xs">{grouped[col.id]?.length || 0}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">${colTotal(col.id).toLocaleString()}</p>
            </div>

            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-32 p-2 space-y-2 border border-t-0 border-border rounded-b-lg transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : 'bg-muted/30'}`}
                >
                  {grouped[col.id]?.map((job, index) => (
                    <Draggable key={job.id} draggableId={job.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                        >
                          <JobCard job={job} onClick={() => onJobClick(job)} isDragging={snapshot.isDragging} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

function JobCard({ job, onClick, isDragging }) {
  const priorityDot = PRIORITY_DOT[job.priority] || PRIORITY_DOT.medium;
  const isFollowUpDue = job.follow_up_date && new Date(job.follow_up_date) <= new Date();

  return (
    <Card
      onClick={onClick}
      className={`cursor-pointer hover:shadow-md transition-shadow text-left ${isDragging ? 'shadow-lg rotate-1 opacity-90' : ''}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-1">
          <p className="font-medium text-sm leading-tight line-clamp-2">{job.client_name}</p>
          <div className={`h-2 w-2 rounded-full mt-1 shrink-0 ${priorityDot}`} title={`Priority: ${job.priority}`} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-1">{job.job_name}</p>
        {job.job_address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{job.job_address}</span>
          </div>
        )}
        {job.client_phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" />
            <span>{job.client_phone}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className="font-heading font-bold text-sm text-primary">
            ${(job.total_price || job.grand_total || 0).toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            {isFollowUpDue && (
              <AlertCircle className="h-3.5 w-3.5 text-orange-500" title="Follow-up vencido" />
            )}
            {job.date && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{job.date}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}