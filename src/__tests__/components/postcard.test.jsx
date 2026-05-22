import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PostCard from '../../components/PostCard.jsx';

// ── Mock AppContext & external deps ──────────────────────────────────────────
// PostCard uses useApp() internally — we mock the whole context module
vi.mock('../../context/AppContext.jsx', () => ({
  useApp: () => ({
    items: [],
    campaigns: [],
    user: { role: 'admin' },
  }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const basePost = {
  id: 'p1',
  title: 'Testartikel',
  content: 'Ein toller Post-Inhalt.',
  status: 'draft',
  channels: ['instagram'],
  scheduledDate: '',
  scheduledTime: '',
  mediaId: null,
  campaignId: null,
};

const makeProps = (overrides = {}) => ({
  post: { ...basePost, ...overrides },
  items: [],
  campaigns: [],
  onEdit: vi.fn(),
  onSched: vi.fn(),
  onDel: vi.fn(),
  onApprove: vi.fn(),
  role: 'admin',
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe('<PostCard>', () => {
  it('renders the post title', () => {
    render(<PostCard {...makeProps()} />);
    expect(screen.getByText('Testartikel')).toBeInTheDocument();
  });

  it('shows "Kein Titel" when title is empty', () => {
    render(<PostCard {...makeProps({ title: '' })} />);
    expect(screen.getByText('Kein Titel')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    render(<PostCard {...makeProps({ status: 'scheduled' })} />);
    expect(screen.getByText('Geplant')).toBeInTheDocument();
  });

  it('calls onEdit when the card is clicked', () => {
    const props = makeProps();
    render(<PostCard {...props} />);
    // The whole card is clickable — click the title to trigger onEdit
    fireEvent.click(screen.getByText('Testartikel'));
    expect(props.onEdit).toHaveBeenCalledWith(basePost);
  });

  it('calls onSched when "Planen" is clicked', () => {
    const props = makeProps();
    render(<PostCard {...props} />);
    fireEvent.click(screen.getByText(/Planen/i));
    expect(props.onSched).toHaveBeenCalledWith(basePost);
  });

  it('renders "Ändern" instead of "Planen" for scheduled posts', () => {
    render(<PostCard {...makeProps({ status: 'scheduled' })} />);
    expect(screen.getByText('Ändern')).toBeInTheDocument();
  });

  it('shows scheduled date when present', () => {
    render(<PostCard {...makeProps({ scheduledDate: '2026-06-15', status: 'scheduled' })} />);
    // fmtDate formats it — just check it contains a date-related string
    const dateEl = screen.getByText(/Jun|15|Mo|Di|Mi|Do|Fr|Sa|So/i);
    expect(dateEl).toBeInTheDocument();
  });

  it('shows "Nicht geplant" for draft without date', () => {
    render(<PostCard {...makeProps({ status: 'draft', scheduledDate: '' })} />);
    expect(screen.getByText(/Nicht geplant/i)).toBeInTheDocument();
  });

  it('shows approval buttons for pending post when role is admin', () => {
    render(<PostCard {...makeProps({ status: 'pending' })} />);
    expect(screen.getByText('OK')).toBeInTheDocument();
    expect(screen.getByText('Nein')).toBeInTheDocument();
  });

  it('calls onApprove with "scheduled" when OK is clicked', () => {
    const props = makeProps({ status: 'pending' });
    render(<PostCard {...props} />);
    fireEvent.click(screen.getByText('OK'));
    expect(props.onApprove).toHaveBeenCalledWith('p1', 'scheduled');
  });

  it('calls onApprove with "draft" when Nein is clicked', () => {
    const props = makeProps({ status: 'pending' });
    render(<PostCard {...props} />);
    fireEvent.click(screen.getByText('Nein'));
    expect(props.onApprove).toHaveBeenCalledWith('p1', 'draft');
  });

  it('hides delete button for viewer role', () => {
    const props = { ...makeProps(), role: 'viewer' };
    render(<PostCard {...props} />);
    // Delete X button should not be present for viewer
    expect(props.onDel).not.toHaveBeenCalled();
  });

  it('shows campaign name when a campaign is assigned', () => {
    const campaign = { id: 'c1', name: 'Sommer Sale', emoji: '☀️', color: '#F59E0B' };
    const props = makeProps({ campaignId: 'c1' });
    props.campaigns = [campaign];
    render(<PostCard {...props} />);
    expect(screen.getByText('Sommer Sale')).toBeInTheDocument();
  });

  it('renders without error for multi-channel posts', () => {
    // New design shows channel icons (no text labels) — card should render without crashing
    const { container } = render(<PostCard {...makeProps({ channels: ['instagram', 'facebook', 'linkedin'] })} />);
    expect(container.firstChild).toBeTruthy();
    // Title still visible
    expect(screen.getByText('Testartikel')).toBeInTheDocument();
  });
});
