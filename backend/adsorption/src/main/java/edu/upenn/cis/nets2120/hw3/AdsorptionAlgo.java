package edu.upenn.cis.nets2120.hw3;
import java.util.*;
import java.io.IOException;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.api.java.JavaPairRDD;
import org.apache.spark.api.java.JavaRDD;
import org.apache.spark.api.java.JavaSparkContext;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.broadcast.Broadcast;
import com.amazonaws.services.dynamodbv2.document.*;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.dynamodbv2.model.QueryRequest;
import com.amazonaws.services.dynamodbv2.model.WriteRequest;
import com.amazonaws.services.dynamodbv2.model.QueryResult;
import com.amazonaws.services.dynamodbv2.model.ScanRequest;
import com.amazonaws.services.dynamodbv2.model.ScanResult;
import com.amazonaws.services.dynamodbv2.document.Table;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.document.utils.ValueMap;
import com.amazonaws.services.dynamodbv2.document.QueryFilter;
import edu.upenn.cis.nets2120.config.Config;
import edu.upenn.cis.nets2120.storage.SparkConnector;
import scala.Tuple2;
import java.time.LocalDate;
import java.text.SimpleDateFormat;
import java.time.format.DateTimeFormatter;
import java.util.stream.Collectors; 
import com.amazonaws.services.dynamodbv2.document.*;

public class AdsorptionAlgo {

    SparkSession spark;
	
	JavaSparkContext context;

    AmazonDynamoDB client;

    DynamoDB dynamoDB;

    HashMap<String, Tuple2<String, List<AttributeValue>>> news;

    void loadNews(int numArticles) {
        int counter = 0;
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
        LocalDate td = LocalDate.now();
        Date today = null;
        try {
            today = dateFormat.parse(td.toString());
        } catch (java.text.ParseException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        this.news = new HashMap();
        Map<String, AttributeValue> lastKeyEvaluated = null;
        do {
            ScanRequest sr = new ScanRequest()
                    .withTableName("news")
                    .withExclusiveStartKey(lastKeyEvaluated);
            ScanResult result = client.scan(sr);
            for (Map<String, AttributeValue> item : result.getItems()) {
                Date articleDate = null;
                try {
                    articleDate = dateFormat.parse(item.get("date").getS());
                } catch (java.text.ParseException e) {
                    // TODO Auto-generated catch block
                    e.printStackTrace();
                }

                if (today.after(articleDate)) {
                    Tuple2<String, List<AttributeValue>> tuple = new Tuple2(item.get("category").getS().toUpperCase(), item.get("likes").getL());
                    this.news.put(item.get("id").getN().toString(), tuple);
                }
            }
            lastKeyEvaluated = result.getLastEvaluatedKey();
            counter = counter + result.getScannedCount();
            System.out.println("counter: " + counter);
        } while (lastKeyEvaluated != null && counter < numArticles);
    }

    public AdsorptionAlgo() {
        this.spark = SparkConnector.getSparkConnection();
		this.context = SparkConnector.getSparkContext();
        this.client = AmazonDynamoDBClientBuilder.standard().withRegion(Regions.US_EAST_1).build();
        this.dynamoDB = new DynamoDB(this.client);
    }

    JavaPairRDD<String, Tuple2<String, Double>> buildFriendNetwork(List<String> usernames) {
        List<Tuple2<String, String>> friends = new ArrayList();
        Map<String, Integer> weights = new HashMap();
        for (String username : usernames) {
            Map<String,AttributeValue> expressionAttributeValues1 = new HashMap<>();
            expressionAttributeValues1.put(":v_id", new AttributeValue().withS(username));
            QueryRequest queryRequest1 = new QueryRequest()
                .withTableName("friends")
                .withKeyConditionExpression("username = :v_id")
                .withExpressionAttributeValues(expressionAttributeValues1);

            QueryResult queryRes1 = this.client.query(queryRequest1);

            for (Map<String, AttributeValue> item : queryRes1.getItems()) {
                String friend = item.get("friend").getS();
                Map<String,AttributeValue> expressionAttributeValues2 = new HashMap<>();
                expressionAttributeValues2.put(":v_id", new AttributeValue().withS(friend));
                expressionAttributeValues2.put(":u_id", new AttributeValue().withS(username));
                QueryRequest queryRequest2 = new QueryRequest()
                    .withTableName("friends")
                    .withKeyConditionExpression("username = :v_id and friend = :u_id")
                    .withExpressionAttributeValues(expressionAttributeValues2);

                QueryResult queryRes2 = this.client.query(queryRequest2);
                if (queryRes2.getItems().size() > 0) {
                    weights.putIfAbsent(username, 0);
                    weights.put(username, weights.get(username) + 1);

                    friends.add(new Tuple2(username, friend));
                }
            }
            
        }


        List<Tuple2<String, Tuple2<String, Double>>> tempFriendNetwork = new ArrayList<Tuple2<String, Tuple2<String, Double>>>();
        for (Tuple2<String, String> pair : friends) {
            int w = weights.get(pair._1);
            tempFriendNetwork.add(new Tuple2<String, Tuple2<String, Double>>(pair._1, new Tuple2<String, Double>(pair._2, 0.3 / ((double) w))));
        }

        JavaPairRDD<String, Tuple2<String, Double>> friendNetwork = this.context.parallelizePairs(tempFriendNetwork);
        return friendNetwork;
            
    };
    

    // (c, u), (u, c)
    Tuple2<JavaPairRDD<String, Tuple2<String, Double>>, JavaPairRDD<String, String>> buildInterestNetwork() {
        ScanRequest scanUsers = new ScanRequest().withTableName("users");
        ScanResult scanRes = client.scan(scanUsers);

        // (u,c)
        List<Tuple2<String, Tuple2<String, Double>>> tupleList = new ArrayList();
        for (Map<String, AttributeValue> user : scanRes.getItems()) {
            double weight = user.get("interests").getL().size();
            for (AttributeValue item : user.get("interests").getL()) {
                tupleList.add(new Tuple2(user.get("username").getS(), new Tuple2(item.getS().toUpperCase(), 0.3 / weight)));
            }
        }
        JavaPairRDD<String, Tuple2<String, Double>> userNetwork = this.context.parallelizePairs(tupleList);

        // (c,u)
        List<Tuple2<String, String>> interestNetworkList = new ArrayList();
        for (Map<String, AttributeValue> user : scanRes.getItems()) {
            for (AttributeValue item : user.get("interests").getL()) {
                interestNetworkList.add(new Tuple2(item.getS().toUpperCase(), user.get("username").getS()));
            }
        }
        JavaPairRDD<String, String> interestNetwork = this.context.parallelizePairs(interestNetworkList);
        return new Tuple2(userNetwork, interestNetwork);
    }


    // (a, c), (a , c)
    Tuple2<JavaPairRDD<String, String>, JavaPairRDD<String, String>> buildCategoryNetwork() {
        // (a,c)
        List<Tuple2<String, String>> articleTupleList = new ArrayList();
        this.news.forEach((key, value) -> {
            articleTupleList.add(new Tuple2(key, value._1));
        });
        JavaPairRDD<String, String> articleNetwork = this.context.parallelizePairs(articleTupleList);

        // (c, a)
        List<Tuple2<String, String>> interestTupleList = new ArrayList();
        this.news.forEach((key, value) -> {
            interestTupleList.add(new Tuple2(value._1, key));
        });
        JavaPairRDD<String, String> interestNetwork = this.context.parallelizePairs(interestTupleList);

        return new Tuple2<JavaPairRDD<String, String>, JavaPairRDD<String, String>>(articleNetwork, interestNetwork);
    }

    Tuple2<JavaPairRDD<String, Tuple2<String, Double>>, JavaPairRDD<String, String>> buildLikedArticlesNetwork() {
        HashMap<String, List<String>> userArticles = new HashMap();
        news.forEach((key, value) -> {
            for (AttributeValue item : value._2) {
                if (userArticles.get(item.getS()) != null) {
                    userArticles.get(item.getS()).add(key);
                } else {
                    List<String> articles = new ArrayList();
                    articles.add(key);
                    userArticles.put(item.getS(), articles);
                }
            }
        });

        // (u,a)
        List<Tuple2<String, Tuple2<String, Double>>> userTupleList = new ArrayList();
        userArticles.forEach((key, value )  -> {
            double weight = value.size();
            for (String interest: value) {
                userTupleList.add(new Tuple2(key, new Tuple2(interest, 0.3 / weight)));
            }
        });
        JavaPairRDD<String, Tuple2<String, Double>> userNetwork = this.context.parallelizePairs(userTupleList);

        // (a,u)
        List<Tuple2<String, String>> articleTupleList = new ArrayList();
        userArticles.forEach((key, value )  -> {
            for (String interest: value) {
                articleTupleList.add(new Tuple2(interest, key));
            }
        });
        JavaPairRDD<String, String> articleNetwork = this.context.parallelizePairs(articleTupleList);

        return new Tuple2(userNetwork, articleNetwork);
    }

     List<String> getUsers() {
        List<String> usernames = new ArrayList();
        ScanRequest scanUsers = new ScanRequest().withTableName("users");
        ScanResult scanRes = client.scan(scanUsers);
        for (Map<String, AttributeValue> item : scanRes.getItems()) {
            usernames.add(item.get("username").getS());
        }
        return usernames;
    }

    void run(int iterations, int numArticles) {
        System.out.println("Running");
        this.loadNews(numArticles);

        // Import networks
        List<String> users = getUsers();
        JavaPairRDD<String, Tuple2<String, Double>> friendNetwork = this.buildFriendNetwork(users);
        Tuple2<JavaPairRDD<String, Tuple2<String, Double>>, JavaPairRDD<String, String>> res = this.buildInterestNetwork();
        JavaPairRDD<String, Tuple2<String, Double>> userToInterest = res._1;
        JavaPairRDD<String, String> interestToUser = res._2;
        Tuple2<JavaPairRDD<String, String>, JavaPairRDD<String, String>> results = this.buildCategoryNetwork();
        JavaPairRDD<String, String> articleToCategory = results._1;
        JavaPairRDD<String, String> categoryToArticle = results._2;
        Tuple2<JavaPairRDD<String, Tuple2<String, Double>>, JavaPairRDD<String, String>> likedArticleNetwork = this.buildLikedArticlesNetwork();
        JavaPairRDD<String, Tuple2<String, Double>> userToLikedArticle = likedArticleNetwork._1;
        JavaPairRDD<String, String> likedArticleToUser = likedArticleNetwork._2;

        // user network
        JavaPairRDD<String, Tuple2<String, Double>> userNetwork = userToInterest.union(userToLikedArticle).union(friendNetwork);
        JavaPairRDD<String, Tuple2<String, Double>> invertedUserNetwork = userNetwork.mapToPair(x -> new Tuple2(x._2._1, new Tuple2(x._1, x._2._2)));

        System.out.println("USER TO USER COUNT: " + friendNetwork.count());
        System.out.println("USER TO INTEREST COUNT: " + userToInterest.count());
        System.out.println("USER TO ARTICLE COUNT: " + userToLikedArticle.count());
        System.out.println("USER NETWORK COUNT: " + userNetwork.count());

        // interest network
        JavaPairRDD<String, String> unionInterestRDD = interestToUser.union(categoryToArticle);
        JavaPairRDD<String, Double> interestEdges = unionInterestRDD
            .mapToPair(x -> new Tuple2<String, Double>(x._1, 1.0))
            .reduceByKey((a, b) -> a + b)
            .mapToPair(x -> new Tuple2<String, Double>(x._1, 1.0 / x._2));
        JavaPairRDD<String, Tuple2<String, Double>> interestNetwork = unionInterestRDD.join(interestEdges);
        JavaPairRDD<String, Tuple2<String, Double>> invertedInterestNetwork = interestNetwork.mapToPair(x -> new Tuple2(x._2._1, new Tuple2(x._1, x._2._2)));

        System.out.println("INTEREST TO USER COUNT: " + interestToUser.count());
        System.out.println("INTEREST TO ARTICLE COUNT: " + categoryToArticle.count());
        System.out.println("INTEREST NETWORK COUNT: " + interestNetwork.count());


        // article network
        List<String> newsList = new ArrayList<String>(this.news.keySet());
        JavaPairRDD<String, String> unionArticleRDD = articleToCategory.union(likedArticleToUser);
        JavaPairRDD<String, Double> articleEdges = unionArticleRDD
            .mapToPair(x -> new Tuple2<String, Double>(x._1, 1.0))
            .reduceByKey((a, b) -> a + b)
            .mapToPair(x -> new Tuple2<String, Double>(x._1, 1.0 / x._2));
        JavaPairRDD<String, Tuple2<String, Double>> articleNetwork = unionArticleRDD.join(articleEdges);
        JavaPairRDD<String, Tuple2<String, Double>> invertedArticleNetwork = articleNetwork.mapToPair(x -> new Tuple2(x._2._1, new Tuple2(x._1, x._2._2)));

        System.out.println("ARTICLE TO USER COUNT: " + likedArticleToUser.count());
        System.out.println("ARTICLE TO INTERST COUNT: " + articleToCategory.count());
        System.out.println("ARTICLE NETWORK COUNT: " + articleNetwork.count());
        System.out.println("Done setting up the graph.");

        // all nodes
        JavaRDD<String> usersRDD = this.context.parallelize(users);
        JavaRDD<String> interestsRDD = interestToUser.map(x -> x._1);
        JavaRDD<String> newsRDD = this.context.parallelize(newsList);
        JavaRDD<String> allNodes = usersRDD.union(interestsRDD).union(newsRDD);

        // set base labels 
        JavaPairRDD<Tuple2<String, String>, Double> labels = allNodes.cartesian(usersRDD).mapToPair(x -> {
            if (x._1 == x._2) {
                return new Tuple2(x, 1.0);
            } else {
                return new Tuple2(x, 0.0);
            }
        });

        Broadcast<List<Tuple2<String, Tuple2<String, Double>>>> userNetworkBC = this.context.broadcast(userNetwork.collect());
        Broadcast<List<Tuple2<String, Tuple2<String, Double>>>> articleNetworkBC = this.context.broadcast(articleNetwork.collect());
        Broadcast<List<Tuple2<String, Tuple2<String, Double>>>> interestNetworkBC = this.context.broadcast(interestNetwork.collect());

        // used to check for convergence
        boolean keepGoing = true;

        System.out.println("Running adsoprtion...");
        for (int i = 0; i < iterations; i++) {
            Broadcast<Map<Tuple2<String, String>, Double>> tempLabels = this.context.broadcast(labels.collectAsMap());
            Map<Tuple2<String, String>, Double> tempLabelMap = tempLabels.value();

            // articles graph
            JavaPairRDD<Tuple2<String, String>, Double> newLabelArticles = newsRDD.cartesian(usersRDD).mapToPair(data -> {
                List<Tuple2<String, Tuple2<String, Double>>> t = articleNetworkBC.value().stream().filter(edges -> edges._1.equals(data._1)).collect(Collectors.toList());
                List<Double> temp = t.stream().map(edge -> {
                    Double d = tempLabelMap.get(new Tuple2<String, String>(edge._2._1, data._2));
                    if (d == null) {
                        return 0.0;
                    } else {
                        return edge._2._2 * d;
                    }
                }).collect(Collectors.toList());

                return new Tuple2<Tuple2<String, String>, Double>(data, temp.stream().collect(Collectors.summingDouble(Double::doubleValue)));
            });

            // users graph
            JavaPairRDD<Tuple2<String, String>, Double> newLabelUsers = usersRDD.cartesian(usersRDD).mapToPair(data -> {
                List<Tuple2<String, Tuple2<String, Double>>> t = userNetworkBC.value().stream().filter(edges -> edges._1.equals(data._1)).collect(Collectors.toList());
                List<Double> temp = t.stream().map(edge -> {
                    Double d = tempLabelMap.get(new Tuple2(edge._2._1, data._2));
                    if (d == null) {
                        return 0.0;
                    } else {
                        return edge._2._2 * d;
                    }
                }).collect(Collectors.toList());
                
                return new Tuple2<Tuple2<String, String>, Double>(data, temp.stream().collect(Collectors.summingDouble(Double::doubleValue)));
            });

             // interests graph
            JavaPairRDD<Tuple2<String, String>, Double> newLabelInterests= interestsRDD.cartesian(usersRDD).mapToPair(data -> {
                List<Tuple2<String, Tuple2<String, Double>>> t = interestNetworkBC.value().stream().filter(edges -> edges._1.equals(data._1)).collect(Collectors.toList());
                List<Double> temp = t.stream().map(edge -> {
                    Double d = tempLabelMap.get(new Tuple2(edge._2._1, data._2));
                    if (d == null) {
                        return 0.0;
                    } else {
                        return edge._2._2 * d;
                    }
                }).collect(Collectors.toList());

                return new Tuple2<Tuple2<String, String>, Double>(data, temp.stream().collect(Collectors.summingDouble(Double::doubleValue)));
            });



            JavaPairRDD<Tuple2<String, String>, Double> newLabels = newLabelUsers.union(newLabelArticles).union(newLabelInterests);
            
            // checks for convergence
            if (i != 0 && !keepGoing) {
				JavaPairRDD<Tuple2<String, String>, Boolean> boolLabels = labels.join(newLabels)
						.mapToPair(x -> new Tuple2<Tuple2<String, String>, Boolean>(x._1, Math.abs(x._2._1 - x._2._2) >= 10));
				keepGoing = boolLabels.map(x -> x._2).fold(false, (a, b) -> a || b);
			}

            // //update value and normalize
            JavaPairRDD<String, Double> totals = newLabels
                .mapToPair(data -> new Tuple2<String, Double>(data._1._2, data._2))
                .reduceByKey( (a,b) -> a + b);
            
            Broadcast<List<Tuple2<String, Double>>> totalBroadcast = this.context.broadcast(totals.collect());
            Map<String, Double> normalValues = new HashMap();
            for (Tuple2<String, Double> t: totalBroadcast.value()) {
                normalValues.put(t._1, t._2);
            }
            labels = newLabels.mapToPair(data -> {
                return new Tuple2(data._1, data._2 / normalValues.get(data._1._2));
            });

            // convergence is true 
            if (!keepGoing) {
                System.out.println(i);
                break;
            }
        }
        System.out.println("Finished runing adsorption!\nWriting articles and scores to DB.");

        List<String> usersList = usersRDD.collect();
        for (String u: usersList) {
            JavaPairRDD<Double, String> userLabels = labels
                .filter(data -> data._1._2.equals(u))
                .mapToPair(data -> new Tuple2(data._2, data._1._1))
				.sortByKey(false);
            
            List<Tuple2<Double, String>> topArticles = userLabels.take(125);
            List<Item> itemList = new ArrayList();
            System.out.println("Writing for user: " + u);
            for (Tuple2<Double, String> t: topArticles) {
                if (t._2.matches("\\d+")) {
                    Map<String,AttributeValue> expressionAttributeValues10 = new HashMap<>();
                    expressionAttributeValues10.put(":v_id", new AttributeValue().withS(u));
                    expressionAttributeValues10.put(":v_article", new AttributeValue().withN(t._2));
                    QueryRequest queryRequest10 = new QueryRequest()
                        .withTableName("recommendations")
                        .withKeyConditionExpression("username = :v_id and article_id = :v_article")
                        .withExpressionAttributeValues(expressionAttributeValues10);

                    QueryResult queryRes10 = this.client.query(queryRequest10);
                    boolean flag = false;
                    if (queryRes10.getItems().size() != 0 ) {
                        for (Map<String, AttributeValue> item : queryRes10.getItems()) {
                            int seen = Integer.parseInt(item.get("seen").getN());
                            if (seen == 0) {
                                flag = true;
                                break;
                            }
                        }
                    } else {
                        flag = true;
                    }
                    if (flag) {
                        Item item = new Item()
                            .withPrimaryKey("username", u, "article_id", Integer.parseInt(t._2))
                            .withNumber("seen", 0);
                        itemList.add(item);
                    }

                }
            }
            for (int i = 0; i < itemList.size(); i += 25) {
                try {
                    TableWriteItems writer = new TableWriteItems("recommendations").withItemsToPut(itemList.subList(i, Math.min(itemList.size(),  i + 25)));
                    BatchWriteItemOutcome out = dynamoDB.batchWriteItem(writer); 
                    Map<String, List<WriteRequest>> unprocessed = out.getUnprocessedItems();
                while (out.getUnprocessedItems().size() > 0) {
                    out = dynamoDB.batchWriteItemUnprocessed(unprocessed);
                }
                } catch (Exception e){
                    e.printStackTrace();
                }
            }
        }
    }


    public static void main(String[] args) {
        AdsorptionAlgo algo = new AdsorptionAlgo();
        algo.run(3, 5000);
        System.out.println("Finished");
    }
}