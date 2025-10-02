CREATE TABLE timetable_items (
  id SERIAL PRIMARY KEY,
  timetable_id INT NOT NULL REFERENCES timetables(id),
  task_master_id INT NOT NULL REFERENCES task_master(id), -- link to master task
  day_of_week SMALLINT NOT NULL, -- 0=Sunday to 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE
);