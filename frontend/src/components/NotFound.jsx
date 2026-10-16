import { Link } from 'react-router-dom';
import { FullPageMessage } from './ui.jsx';

export default function NotFound() {
  return (
    <FullPageMessage
      title="This page isn’t in the queue"
      body="The link may be old or mistyped."
      action={
        <div className="flex gap-2">
          <Link to="/" className="btn btn-primary">Go home</Link>
          <Link to="/join" className="btn btn-quiet">Join with a code</Link>
        </div>
      }
    />
  );
}
