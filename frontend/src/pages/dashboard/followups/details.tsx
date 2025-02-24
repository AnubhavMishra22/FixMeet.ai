import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import {
  ArrowLeft,
  Send,
  SkipForward,
  RefreshCw,
  Calendar,
  User,
  Clock,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  Mail,
} from 'lucide-react';
import {
  getFollowup,
  updateFollowup as updateFollowupApi,
  sendFollowup as sendFollowupApi,
  skipFollowup as skipFollowupApi,
} from '../../../lib/api';
import { useToast } from '../../../stores/toast-store';
import type { MeetingFollowupWithBooking, FollowupStatus } from '../../../types';

export default function FollowupDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [followup, setFollowup] = useState<MeetingFollowupWithBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Editable fields
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [newActionItem, setNewActionItem] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id) fetchFollowup();
  }, [id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [body]);

  async function fetchFollowup() {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await getFollowup(id);
      setFollowup(data);
      setSubject(data.subject || '');
      setBody(data.body || '');
      setActionItems(data.actionItems || []);
      setHasUnsavedChanges(false);
    } catch {
      toast({ title: 'Failed to load follow-up', variant: 'destructive' });
      navigate('/dashboard/followups');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    try {
      await updateFollowupApi(id, { subject, body, actionItems });
      setHasUnsavedChanges(false);
      toast({ title: 'Follow-up saved' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSend() {
    if (!id) return;
    // Save first if there are unsaved changes
    if (hasUnsavedChanges) {
      try {
        await updateFollowupApi(id, { subject, body, actionItems });
      } catch {
        toast({ title: 'Failed to save before sending', variant: 'destructive' });
        return;
      }
    }

    setIsSending(true);
    try {
      await sendFollowupApi(id);
      toast({ title: 'Follow-up sent successfully!' });
      navigate('/dashboard/followups');
    } catch {
      toast({ title: 'Failed to send follow-up', variant: 'destructive' });
    } finally {
      setIsSending(false);
      setShowSendConfirm(false);
    }
  }

  async function handleSkip() {
    if (!id) return;
    setIsSkipping(true);
    try {
      await skipFollowupApi(id);
      toast({ title: 'Follow-up skipped' });
      navigate('/dashboard/followups');
    } catch {
      toast({ title: 'Failed to skip follow-up', variant: 'destructive' });
    } finally {
      setIsSkipping(false);
    }
  }

  function addActionItem() {
    if (newActionItem.trim()) {
      setActionItems([...actionItems, newActionItem.trim()]);
      setNewActionItem('');
      setHasUnsavedChanges(true);
    }
  }

  function removeActionItem(index: number) {
    setActionItems(actionItems.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }

  function getStatusBadge(status: FollowupStatus) {
    switch (status) {
      case 'draft':
        return <Badge className="bg-blue-100 text-blue-800">Draft</Badge>;
      case 'sent':
        return <Badge className="bg-green-100 text-green-800">Sent</Badge>;
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const isDraft = followup?.status === 'draft';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!followup) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate('/dashboard/followups')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to follow-ups
      </Button>

      {/* Meeting info header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {followup.booking.eventTypeTitle}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Follow-up email</p>
            </div>
            {getStatusBadge(followup.status)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{followup.booking.inviteeName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(followup.booking.startTime), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                {format(new Date(followup.booking.startTime), 'h:mm a')} –{' '}
                {format(new Date(followup.booking.endTime), 'h:mm a')}
              </span>
            </div>
          </div>

          {followup.sentAt && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Sent on {format(new Date(followup.sentAt), 'MMM d, yyyy h:mm a')} to{' '}
                {followup.booking.inviteeEmail}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Content
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Subject */}
          <div>
            <Label htmlFor="subject">Subject Line</Label>
            {isDraft ? (
              <Input
                id="subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter email subject..."
                className="mt-1"
              />
            ) : (
              <p className="mt-1 text-gray-800 font-medium">{subject || 'No subject'}</p>
            )}
          </div>

          {/* Body */}
          <div>
            <Label htmlFor="body">Email Body</Label>
            {isDraft ? (
              <Textarea
                ref={textareaRef}
                id="body"
                value={body}
                onChange={(e) => {
                  setBody(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Write your follow-up email..."
                className="mt-1 min-h-[200px] resize-none"
              />
            ) : (
              <div className="mt-1 p-4 bg-gray-50 rounded-md whitespace-pre-wrap text-gray-800">
                {body || 'No content'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Action Items ({actionItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {actionItems.length === 0 && !isDraft ? (
            <p className="text-gray-500 text-sm">No action items</p>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="flex-1 text-gray-800">{item}</span>
                  {isDraft && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => removeActionItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isDraft && (
            <div className="flex gap-2 mt-4">
              <Input
                value={newActionItem}
                onChange={(e) => setNewActionItem(e.target.value)}
                placeholder="Add an action item..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addActionItem();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={addActionItem}
                disabled={!newActionItem.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      {isDraft && (
        <Card>
          <CardContent className="p-4">
            {showSendConfirm ? (
              <div className="flex items-center justify-between bg-violet-50 p-4 rounded-lg">
                <p className="text-sm">
                  Send this follow-up to <strong>{followup.booking.inviteeEmail}</strong>?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSendConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1" />
                        Confirm Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {hasUnsavedChanges && (
                    <Button
                      variant="outline"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Draft'
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={isSkipping}
                  >
                    {isSkipping ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Skipping...
                      </>
                    ) : (
                      <>
                        <SkipForward className="h-4 w-4 mr-1" />
                        Skip
                      </>
                    )}
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    if (!subject || !body) {
                      toast({
                        title: 'Please add a subject and body before sending',
                        variant: 'destructive',
                      });
                      return;
                    }
                    setShowSendConfirm(true);
                  }}
                  disabled={!subject || !body}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Send Follow-up
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata footer */}
      <div className="text-xs text-gray-400 text-center pb-4">
        Created {format(new Date(followup.createdAt), 'MMM d, yyyy h:mm a')}
        {followup.sentAt && (
          <> · Sent {format(new Date(followup.sentAt), 'MMM d, yyyy h:mm a')}</>
        )}
      </div>
    </div>
  );
}
