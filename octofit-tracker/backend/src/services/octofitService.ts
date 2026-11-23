import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Activity input must be an object'), { status: 400 });
  }

  const { userId, teamId, type, minutes } = input as Record<string, unknown>;
  if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) {
    throw Object.assign(new Error('A valid userId is required'), { status: 400 });
  }
  if (typeof teamId !== 'string' || !Types.ObjectId.isValid(teamId)) {
    throw Object.assign(new Error('A valid teamId is required'), { status: 400 });
  }
  if (typeof type !== 'string' || !type.trim()) {
    throw Object.assign(new Error('An activity type is required'), { status: 400 });
  }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Minutes must be a positive number'), { status: 400 });
  }

  const [user, team] = await Promise.all([User.exists({ _id: userId }), Team.exists({ _id: teamId })]);
  if (!user || !team) {
    throw Object.assign(new Error('Activity user and team must exist'), { status: 404 });
  }

  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw Object.assign(new Error('Team input must be an object'), { status: 400 });
  }

  const { name, mascot, members = [] } = input as Record<string, unknown>;
  if (typeof name !== 'string' || !name.trim()) {
    throw Object.assign(new Error('A team name is required'), { status: 400 });
  }
  if (typeof mascot !== 'string' || !mascot.trim()) {
    throw Object.assign(new Error('A team mascot is required'), { status: 400 });
  }
  if (!Array.isArray(members) || !members.every((member) => typeof member === 'string' && Types.ObjectId.isValid(member))) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }

  const uniqueMembers = [...new Set(members)];
  if (uniqueMembers.length > 0) {
    const existingMembers = await User.countDocuments({ _id: { $in: uniqueMembers } });
    if (existingMembers !== uniqueMembers.length) {
      throw Object.assign(new Error('All team members must exist'), { status: 404 });
    }
  }

  return Team.create({ name: name.trim(), mascot: mascot.trim(), members: uniqueMembers });
}

export async function getLeaderboard() {
  const totals = await Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
    { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
  ]);
  const teams = await Team.find({ _id: { $in: totals.map(({ _id }) => _id) } }).select('name').lean();
  const teamNames = new Map(teams.map((team) => [team._id.toString(), team.name]));

  return totals
    .flatMap(({ _id, totalPoints }) => {
      const teamName = teamNames.get(_id.toString());
      return teamName === undefined ? [] : [{ teamName, totalPoints }];
    })
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }

  const activities = await Activity.find({ user: user._id }).select('type').lean();
  const activityTypes = [...new Set(activities.map(({ type }) => type.trim().toLowerCase()))];
  const goal = user.fitnessGoal.trim().toLowerCase();
  const matchingFocuses = new Set([goal, ...activityTypes]);
  const workouts = await Workout.find().lean();

  return workouts
    .filter(({ focus }) => matchingFocuses.has(focus.trim().toLowerCase()))
    .sort((left, right) => Number(right.focus.trim().toLowerCase() === goal) - Number(left.focus.trim().toLowerCase() === goal))
    .map((workout) => ({
      ...workout,
      reason: workout.focus.trim().toLowerCase() === goal
        ? `Recommended for your ${user.fitnessGoal} goal${activityTypes.length ? ` and ${activityTypes.join(', ')} activity` : ''}.`
        : `Recommended based on your ${workout.focus} activity.`,
    }));
}

export { User };
