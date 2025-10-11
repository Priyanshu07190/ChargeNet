import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation, MapPin } from 'lucide-react';

type StartType = 'current' | 'address';

interface TripPlannerProps {
	source?: 'driver' | 'host';
}

const TripPlanner: React.FC<TripPlannerProps> = ({ source = 'driver' }) => {
	const navigate = useNavigate();
	const [startType, setStartType] = useState<StartType>('current');
	const [start, setStart] = useState('');
	const [dest, setDest] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!dest.trim()) {
			alert('Please enter a destination');
			return;
		}
		setIsSubmitting(true);
		try {
			const params = new URLSearchParams();
			params.set('source', source);
			params.set('trip', '1');
			params.set('dest', dest.trim());
			if (startType === 'address' && start.trim()) {
				params.set('startType', 'address');
				params.set('start', start.trim());
			} else {
				params.set('startType', 'current');
			}
			navigate(`/map?${params.toString()}`);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
			<div className="flex items-center justify-between mb-4">
				<h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
					<Navigation className="h-5 w-5 text-blue-600" /> Trip Planner
				</h3>
			</div>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div className="flex items-center gap-4">
					<label className="inline-flex items-center gap-2 text-sm">
						<input
							type="radio"
							name="startType"
							value="current"
							checked={startType === 'current'}
							onChange={() => setStartType('current')}
						/>
						Use current location
					</label>
					<label className="inline-flex items-center gap-2 text-sm">
						<input
							type="radio"
							name="startType"
							value="address"
							checked={startType === 'address'}
							onChange={() => setStartType('address')}
						/>
						Enter a start address
					</label>
				</div>

				{startType === 'address' && (
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
						<div className="relative">
							<MapPin className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								type="text"
								value={start}
								onChange={(e) => setStart(e.target.value)}
								placeholder="Enter start address or city"
								className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>
				)}

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
					<div className="relative">
						<MapPin className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							type="text"
							value={dest}
							onChange={(e) => setDest(e.target.value)}
							placeholder="Enter destination (e.g., Delhi)"
							className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>
				</div>

				<button
					type="submit"
					disabled={isSubmitting}
					className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white font-medium transition-colors ${
						isSubmitting ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
					}`}
				>
					<Navigation className="h-4 w-4" />
					{isSubmitting ? 'Planning...' : 'Plan Trip'}
				</button>
			</form>
			<p className="text-xs text-gray-500 mt-3">We’ll show a route with chargers available along the way.</p>
		</div>
	);
};

export default TripPlanner;
