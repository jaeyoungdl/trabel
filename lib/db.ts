import { Pool } from 'pg';

// PostgreSQL 연결 풀
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export class Database {
  // Trip 관련 함수들
  static async createTrip(data: { title: string; description?: string; startDate: string; endDate: string }) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO trips (id, title, description, "startDate", "endDate", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `;
      const result = await client.query(query, [data.title, data.description, data.startDate, data.endDate]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getAllTrips() {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM trips ORDER BY "createdAt" DESC';
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Place 관련 함수들
  static async createPlace(data: {
    name: string;
    address: string;
    time: string;
    duration: string;
    day: number;
    order: number;
    category: string;
    placeId?: string;
    operatingHours?: Record<string, string[]>;
    notes?: string;
    tripId: string;
  }) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO places (id, name, address, time, duration, day, "order", category, "placeId", "operatingHours", notes, "tripId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `;
      const result = await client.query(query, [
        data.name, data.address, data.time, data.duration, data.day, data.order,
        data.category, data.placeId, 
        data.operatingHours ? JSON.stringify(data.operatingHours) : null, 
        data.notes, data.tripId
      ]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getPlacesByTripId(tripId: string) {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM places WHERE "tripId" = $1 ORDER BY day, "order"';
      const result = await client.query(query, [tripId]);
      return result.rows.map(row => ({
        ...row,
        operatingHours: row.operatingHours && typeof row.operatingHours === 'string' 
          ? JSON.parse(row.operatingHours) 
          : row.operatingHours
      }));
    } finally {
      client.release();
    }
  }

  static async updatePlace(id: string, data: Partial<{
    name: string;
    address: string;
    time: string;
    duration: string;
    day: number;
    order: number;
    category: string;
    operatingHours: Record<string, string[]> | string;
    notes: string;
  }>) {
    const client = await pool.connect();
    try {
      const processedData: Record<string, unknown> = { ...data };
      
      // operatingHours가 객체이면 JSON 문자열로 변환
      if (processedData.operatingHours && typeof processedData.operatingHours === 'object') {
        processedData.operatingHours = JSON.stringify(processedData.operatingHours);
      }
      
      const fields = Object.keys(processedData).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      const values = Object.values(processedData);
      
      const query = `UPDATE places SET ${fields}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`;
      const result = await client.query(query, [id, ...values]);
      
      // 반환할 때 operatingHours를 다시 객체로 변환
      const resultRow = result.rows[0];
      if (resultRow.operatingHours && typeof resultRow.operatingHours === 'string') {
        resultRow.operatingHours = JSON.parse(resultRow.operatingHours);
      }
      
      return resultRow;
    } finally {
      client.release();
    }
  }

  static async deletePlace(id: string) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM places WHERE id = $1';
      await client.query(query, [id]);
      return { success: true };
    } finally {
      client.release();
    }
  }

  static async updateMultiplePlaces(places: Array<{ id: string; day: number; order: number }>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const place of places) {
        await client.query(
          'UPDATE places SET day = $1, "order" = $2, "updatedAt" = NOW() WHERE id = $3',
          [place.day, place.order, place.id]
        );
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Expense 관련 함수들
  static async createExpense(data: {
    amount: number;
    description: string;
    category: string;
    date: string;
    currency: string;
    placeId?: string;
    tripId: string;
  }) {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO expenses (id, amount, description, category, date, currency, "placeId", "tripId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;
      const result = await client.query(query, [
        data.amount, data.description, data.category, data.date, data.currency, data.placeId, data.tripId
      ]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async getExpensesByTripId(tripId: string) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT e.*, p.name as place_name, p.day as place_day
        FROM expenses e
        LEFT JOIN places p ON e."placeId" = p.id
        WHERE e."tripId" = $1
        ORDER BY e.date, e."createdAt"
      `;
      const result = await client.query(query, [tripId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  static async updateExpense(id: string, data: Partial<{
    amount: number;
    description: string;
    category: string;
    date: string;
    currency: string;
  }>) {
    const client = await pool.connect();
    try {
      const fields = Object.keys(data).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
      const values = Object.values(data);

      const query = `UPDATE expenses SET ${fields}, "updatedAt" = NOW() WHERE id = $1 RETURNING *`;
      const result = await client.query(query, [id, ...values]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  static async deleteExpense(id: string) {
    const client = await pool.connect();
    try {
      const query = 'DELETE FROM expenses WHERE id = $1';
      await client.query(query, [id]);
      return { success: true };
    } finally {
      client.release();
    }
  }

  // 일정별 비용 조회
  static async getExpensesByPlaceId(placeId: string) {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM expenses WHERE "placeId" = $1 ORDER BY "createdAt"';
      const result = await client.query(query, [placeId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // 통계 조회
  static async getExpenseStats(tripId: string) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          category,
          SUM(amount) as total_amount,
          COUNT(*) as count
        FROM expenses 
        WHERE "tripId" = $1 
        GROUP BY category
        ORDER BY total_amount DESC
      `;
      const result = await client.query(query, [tripId]);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

export default Database; 