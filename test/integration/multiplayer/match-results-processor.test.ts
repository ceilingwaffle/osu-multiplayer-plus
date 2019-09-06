// // arrange: ApiMultiplayer object
// // act: MultiplayerResultsService...
// // assert: MatchResults object

// describe("When processing multiplayer results", function() {
//   describe("with a number of results", function() {
//     it("should not throw an error when processing 0 match results");
//     it("should finish to completion when processing 1 match result");
//     it("should finish to completion when processing 2 match results");
//   });

//   describe("with no tied scores", function() {
//     it("should ensure exactly 1 team won the match when there are no ties");
//     it("should ensure exactly 1 team was eliminated when there are no ties");
//   });

//   describe("with tied scores", function() {
//     it("should ensure exactly 1 team won the match when there are 2 ties but no ties were scored by the highest-scoring team");
//     it("should ensure exactly 0 teams won the match when there are 2 ties and the ties were scored by the highest-scoring teams");
//     it("should ensure exactly 0 teams won the match when there are 3 ties and the ties were scored by the highest-scoring teams");

//     it("should ensure exactly 1 team was eliminated when there are 2 ties but no ties were scored by the lowest-scoring team");
//     it("should ensure exactly 0 teams were eliminated when there are 2 ties and the ties were scored by the lowest-scoring teams");
//     it("should ensure exactly 0 teams were eliminated when there are 3 ties and the ties were scored by the lowest-scoring teams");
//   });

//   describe("with a team to be a winner", function() {
//     it("should ensure only the highest-scoring team was the winner");
//   });

//   describe("with a team to lose a life", function() {
//     it("should ensure only the lowest-scoring team lost exactly one life");
//   });

//   describe("with a team to be eliminated", function() {
//     it("should ensure that a team losing its last remaining life was the only team eliminated");
//     it("should ensure that a team losing one of its two lives was NOT eliminated");
//   });

//   describe("with an aborted match", function() {
//     it("should ensure no teams lost a life");
//     it("should ensure an aborted match report was generated");
//   });

//   describe("with a team on a winning streak", function() {
//     it("should ensure that no teams are marked as having a winning streak when a team wins a match but did not win the previous match");
//     it("should ensure that only the team winning 2 matches in a row is marked as having a winning streak of 1");
//     it("should ensure that only the team winning 3 matches in a row is marked as having a winning streak of 2");
//   });

//   describe("with leaderboard positioned to be determined", function() {
//     it("should ensure a team gaining 1 position causes the team it overtook to lose 1 position");
//     it("should ensure a team gaining 1 position is marked as having gained 1 position");
//     it("should ensure a team gaining 2 positions is marked as having gained 2 positions");
//     it("should ensure a team losing 1 position is marked as having lost 1 position");
//     it("should ensure a team losing 2 positions is marked as having lost 2 positions");
//     it("should ensure the leaderboard is correctly determined from the priority of events", function() {
//       // See todo note: Team rank/leaderboard @created(19-09-04 10:08)
//     });
//   });
// });
