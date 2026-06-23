# ══════════════════════════════════════
# SmartRent — app.py
# Universal Web Service Rental System
# Smart Design & Construction 2025/2026
# ══════════════════════════════════════

from app import img_url
from flask import (
    Flask, request, session, jsonify,
    render_template, redirect, url_for
)
from flask_bcrypt import Bcrypt
from config import Config
from database import get_db, init_app, init_db
import os
import re
import traceback
from datetime import datetime
from werkzeug.utils import secure_filename
import re
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config.from_object(Config)

bcrypt = Bcrypt(app)
init_app(app)

@app.errorhandler(Exception)
def handle_exception(e):
    if hasattr(e, 'code'):
        return jsonify({'error': str(e)}), e.code
    print(f"Server Error: {e}")
    traceback.print_exc()
    return jsonify({'error': 'An internal server error occurred.'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({'error': 'An internal server error occurred.'}), 500


# ── Auto-create & seed DB on first run ──
def ensure_db():
    if not os.path.exists(app.config['DATABASE']):
        with app.app_context():
            init_db()
            # Re-hash demo passwords properly
            db = get_db()
            hashed = bcrypt.generate_password_hash('demo123').decode('utf-8')
            db.execute('UPDATE users SET password = ?', (hashed,))
            db.commit()

ensure_db()


# ══════════════════════════════════════
# HELPER
# ══════════════════════════════════════
def row_to_dict(row):
    return dict(row) if row else None


def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    db = get_db()
    return row_to_dict(db.execute('SELECT * FROM users WHERE id = ?', (uid,)).fetchone())


def login_required(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get('user_id'):
            return jsonify({'error': 'Not authenticated'}), 401
        return fn(*args, **kwargs)
    return wrapper


# ══════════════════════════════════════
# FRONTEND — serve the SPA
# ══════════════════════════════════════
@app.route('/')
def index():
    return render_template('index.html')


# ══════════════════════════════════════
# AUTH ROUTES
# ══════════════════════════════════════

@app.route('/api/register', methods=['POST'])
def register():
    data     = request.get_json()
    fname    = (data.get('fname') or '').strip()
    lname    = (data.get('lname') or '').strip()
    email    = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '')
    confirm_password = (data.get('confirm_password') or '')
    roles    = (data.get('roles') or 'renter')

    if not all([fname, lname, email, password, confirm_password]):
        return jsonify({'error': 'All fields are required.'}), 400
    if password != confirm_password:
        return jsonify({'error': 'Passwords do not match.'}), 400
    if len(password) < 8 or not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        return jsonify({'error': 'Password must be at least 8 characters and contain both letters and numbers.'}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', (email,)).fetchone()
    if existing:
        return jsonify({'error': 'An account with this email already exists.'}), 409

    hashed = bcrypt.generate_password_hash(password).decode('utf-8')
    cur = db.execute(
        'INSERT INTO users (fname, lname, email, password, roles) VALUES (?, ?, ?, ?, ?)',
        (fname, lname, email, hashed, roles)
    )
    db.commit()

    user_id = cur.lastrowid
    session['user_id'] = user_id
    session.permanent = True

    user = row_to_dict(db.execute('SELECT id, fname, lname, email, roles FROM users WHERE id = ?', (user_id,)).fetchone())
    user['avatar'] = (fname[0] + lname[0]).upper()
    return jsonify({'user': user}), 201


@app.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    db   = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()

    if not user or not bcrypt.check_password_hash(user['password'], password):
        return jsonify({'error': 'Incorrect email or password.'}), 401

    session['user_id'] = user['id']
    session.permanent  = True

    u = row_to_dict(user)
    u.pop('password', None)
    u['avatar'] = (u['fname'][0] + u['lname'][0]).upper()
    return jsonify({'user': u}), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out.'}), 200


@app.route('/api/me', methods=['GET'])
def me():
    u = current_user()
    if not u:
        return jsonify({'user': None}), 200
    u.pop('password', None)
    u['avatar'] = (u['fname'][0] + u['lname'][0]).upper()
    return jsonify({'user': u}), 200


# ══════════════════════════════════════
# LISTINGS ROUTES
# ══════════════════════════════════════

@app.route('/api/listings', methods=['GET'])
def get_listings():
    db       = get_db()
    category = request.args.get('category', '')
    status   = request.args.get('status', '')
    search   = request.args.get('search', '')
    page     = request.args.get('page', 1, type=int)
    uid      = session.get('user_id')
    page     = int(request.args.get('page', 1))
    limit    = int(request.args.get('limit', 10))

    query  = '''
        SELECT l.*, u.fname, u.lname
        FROM listings l
        JOIN users u ON l.owner_id = u.id
        WHERE 1=1
    '''
    params = []

    # Exclude current user's own listings from browse
    if uid:
        query += ' AND l.owner_id != ?'
        params.append(uid)
    if category:
        query += ' AND l.category = ?'
        params.append(category)
    if status:
        query += ' AND l.status = ?'
        params.append(status)
    if search:
        query += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.category LIKE ?)'
        s = '%' + search + '%'
        params.extend([s, s, s])

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?'
    offset = (page - 1) * limit
    params.extend([limit, offset])

    rows = db.execute(query, params).fetchall()
    listings = []
    for r in rows:
        item = row_to_dict(r)
        item['owner_name'] = item.pop('fname') + ' ' + item.pop('lname')
        listings.append(item)
    return jsonify({'listings': listings}), 200


@app.route('/api/my-listings', methods=['GET'])
@login_required
def my_listings():
    db  = get_db()
    uid = session['user_id']
    page = request.args.get('page', 1, type=int)
    limit = 10
    offset = (page - 1) * limit
    rows = db.execute(
        'SELECT * FROM listings WHERE owner_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', (uid, limit, offset)
    ).fetchall()
    return jsonify({'listings': [row_to_dict(r) for r in rows]}), 200


@app.route('/api/listings', methods=['POST'])
@login_required
def add_listing():
    title = (request.form.get('title') or '').strip()
    cat   = (request.form.get('category') or '').strip()
    desc  = (request.form.get('description') or '').strip()
    price = request.form.get('price')
    loc   = (request.form.get('location') or '').strip()

    file = request.files.get('file')
    if not all([title, cat, desc, price, loc]):
        return jsonify({'error': 'All fields are required.'}), 400
    if not file or not file.filename:
        return jsonify({'error': 'Please provide an image for your listing.'}), 400

    filename = secure_filename(file.filename)
    upload_folder = os.path.join(app.root_path, 'static', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)
    file.save(os.path.join(upload_folder, filename))
    img = f'/static/uploads/{filename}'

    db  = get_db()
    uid = session['user_id']
    cur = db.execute(
        '''INSERT INTO listings (owner_id, title, category, description, price, location, img_url)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (uid, title, cat, desc, float(price), loc, img_url)
    )
    db.commit()
    new_id = cur.lastrowid
    listing = row_to_dict(db.execute('SELECT * FROM listings WHERE id = ?', (new_id,)).fetchone())
    return jsonify({'listing': listing}), 201


@app.route('/api/listings/<int:listing_id>', methods=['DELETE'])
@login_required
def delete_listing(listing_id):
    db  = get_db()
    uid = session['user_id']
    row = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Listing not found.'}), 404
    if row['owner_id'] != uid:
        return jsonify({'error': 'Not authorised.'}), 403
    db.execute('DELETE FROM listings WHERE id = ?', (listing_id,))
    db.commit()
    return jsonify({'message': 'Listing deleted.'}), 200


@app.route('/api/listings/<int:listing_id>/toggle', methods=['PUT'])
@login_required
def toggle_listing(listing_id):
    db  = get_db()
    uid = session['user_id']
    row = db.execute('SELECT * FROM listings WHERE id = ?', (listing_id,)).fetchone()
    if not row:
        return jsonify({'error': 'Listing not found.'}), 404
    if row['owner_id'] != uid:
        return jsonify({'error': 'Not authorised.'}), 403
    new_status = 'rented' if row['status'] == 'available' else 'available'
    db.execute('UPDATE listings SET status = ? WHERE id = ?', (new_status, listing_id))
    db.commit()
    return jsonify({'status': new_status}), 200


# ══════════════════════════════════════
# RENTAL REQUEST ROUTES
# ══════════════════════════════════════

@app.route('/api/requests', methods=['POST'])
@login_required
def submit_request():
    data       = request.get_json()
    item_id    = data.get('item_id')
    start_date = (data.get('start_date') or '').strip()
    end_date   = (data.get('end_date') or '').strip()
    message    = (data.get('message') or '').strip()

    if not all([item_id, start_date, end_date]):
        return jsonify({'error': 'Item, start date and end date are required.'}), 400
    
    try:
        sd = datetime.strptime(start_date, '%Y-%m-%d')
        ed = datetime.strptime(end_date, '%Y-%m-%d')
        delta = (ed - sd).days
        if delta <= 0:
            return jsonify({'error': 'End date must be strictly after start date.'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    db  = get_db()
    uid = session['user_id']

    item = db.execute('SELECT * FROM listings WHERE id = ?', (item_id,)).fetchone()
    if not item:
        return jsonify({'error': 'Item not found.'}), 404
    if item['status'] != 'available':
        return jsonify({'error': 'This item is not currently available.'}), 409

    total_cost = delta * item['price']

    cur = db.execute(
        '''INSERT INTO rental_requests (item_id, renter_id, start_date, end_date, message)
           VALUES (?, ?, ?, ?, ?)''',
        (item_id, uid, start_date, end_date, message)
    )
    db.commit()
    req = row_to_dict(db.execute('SELECT * FROM rental_requests WHERE id = ?', (cur.lastrowid,)).fetchone())
    req['total_cost'] = total_cost
    req['duration_days'] = delta
    return jsonify({'request': req}), 201


@app.route('/api/my-requests', methods=['GET'])
@login_required
def my_requests():
    """All requests made by the current renter."""
    db  = get_db()
    uid = session['user_id']
    rows = db.execute(
        '''SELECT r.*, l.title AS item_title, l.price AS item_price
           FROM rental_requests r
           JOIN listings l ON r.item_id = l.id
           WHERE r.renter_id = ?
           ORDER BY r.created_at DESC''',
        (uid,)
    ).fetchall()
    return jsonify({'requests': [row_to_dict(r) for r in rows]}), 200


@app.route('/api/incoming-requests', methods=['GET'])
@login_required
def incoming_requests():
    """All requests for listings owned by the current user."""
    db  = get_db()
    uid = session['user_id']
    rows = db.execute(
        '''SELECT r.*, l.title AS item_title, u.fname, u.lname
           FROM rental_requests r
           JOIN listings l ON r.item_id = l.id
           JOIN users u    ON r.renter_id = u.id
           WHERE l.owner_id = ?
           ORDER BY r.created_at DESC''',
        (uid,)
    ).fetchall()
    result = []
    for row in rows:
        d = row_to_dict(row)
        d['renter_name'] = d.pop('fname') + ' ' + d.pop('lname')
        result.append(d)
    return jsonify({'requests': result}), 200


@app.route('/api/requests/<int:req_id>', methods=['PUT'])
@login_required
def update_request(req_id):
    """Owner approves or declines a request."""
    data   = request.get_json()
    action = data.get('action')  # 'approved' or 'declined'

    if action not in ('approved', 'declined'):
        return jsonify({'error': 'Invalid action.'}), 400

    db  = get_db()
    uid = session['user_id']

    req = db.execute(
        '''SELECT r.*, l.owner_id
           FROM rental_requests r
           JOIN listings l ON r.item_id = l.id
           WHERE r.id = ?''',
        (req_id,)
    ).fetchone()

    if not req:
        return jsonify({'error': 'Request not found.'}), 404
    if req['owner_id'] != uid:
        return jsonify({'error': 'Not authorised.'}), 403

    db.execute('UPDATE rental_requests SET status = ? WHERE id = ?', (action, req_id))

    # If approved, mark item as rented
    if action == 'approved':
        db.execute('UPDATE listings SET status = ? WHERE id = ?', ('rented', req['item_id']))

    db.commit()
    return jsonify({'status': action}), 200


# ══════════════════════════════════════
# PROFILE ROUTE
# ══════════════════════════════════════

@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    data  = request.get_json()
    fname = (data.get('fname') or '').strip()
    lname = (data.get('lname') or '').strip()

    if not fname or not lname:
        return jsonify({'error': 'Name fields are required.'}), 400

    db  = get_db()
    uid = session['user_id']
    db.execute('UPDATE users SET fname = ?, lname = ? WHERE id = ?', (fname, lname, uid))
    db.commit()

    u = row_to_dict(db.execute('SELECT id, fname, lname, email, roles FROM users WHERE id = ?', (uid,)).fetchone())
    u['avatar'] = (u['fname'][0] + u['lname'][0]).upper()
    return jsonify({'user': u}), 200


# ══════════════════════════════════════
# ANALYTICS ROUTE
# ══════════════════════════════════════

@app.route('/api/analytics', methods=['GET'])
@login_required
def get_analytics():
    db = get_db()
    uid = session['user_id']

    active_rentals_row = db.execute(
        "SELECT COUNT(*) as count FROM listings WHERE owner_id = ? AND status = 'rented'",
        (uid,)
    ).fetchone()
    active_rentals = active_rentals_row['count'] if active_rentals_row else 0

    pending_requests_row = db.execute(
        '''SELECT COUNT(*) as count 
           FROM rental_requests r
           JOIN listings l ON r.item_id = l.id
           WHERE l.owner_id = ? AND r.status = 'pending' ''',
        (uid,)
    ).fetchone()
    pending_requests = pending_requests_row['count'] if pending_requests_row else 0

    estimated_earnings_row = db.execute(
        "SELECT SUM(price) as total FROM listings WHERE owner_id = ? AND status = 'rented'",
        (uid,)
    ).fetchone()
    estimated_earnings = estimated_earnings_row['total'] if estimated_earnings_row and estimated_earnings_row['total'] else 0.0

    return jsonify({
        'active_rentals': active_rentals,
        'pending_requests': pending_requests,
        'estimated_earnings': estimated_earnings
    }), 200


# ══════════════════════════════════════
# RUN
# ══════════════════════════════════════
if __name__ == '__main__':
    app.run(debug=True, port=5000)
